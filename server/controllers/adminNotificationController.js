import supabase from '../config/supabase.js';

// In-memory fallback and SSE broadcasting infrastructure
const sseClients = new Set();
const recentNotificationsBuffer = [];
const MAX_BUFFER_SIZE = 50;

/**
 * Broadcast an incoming notification to all connected admin SSE clients
 */
export const broadcastAdminNotification = (notification) => {
  if (!notification) return;

  // Cache in local ring buffer for immediate recall
  const existingIdx = recentNotificationsBuffer.findIndex((n) => n.id === notification.id);
  if (existingIdx > -1) {
    recentNotificationsBuffer[existingIdx] = notification;
  } else {
    recentNotificationsBuffer.unshift(notification);
    if (recentNotificationsBuffer.length > MAX_BUFFER_SIZE) {
      recentNotificationsBuffer.pop();
    }
  }

  const payloadString = JSON.stringify(notification);
  for (const client of sseClients) {
    try {
      client.res.write(`event: notification\ndata: ${payloadString}\n\n`);
    } catch (err) {
      console.warn('[SSE] Failed to write to client:', err.message);
      sseClients.delete(client);
    }
  }
};

/**
 * Server-Sent Events endpoint for real-time admin notification streaming
 * @route   GET /api/admin/notifications/stream
 * @access  Private/Admin
 */
export const notificationStream = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const client = { id: Date.now() + Math.random(), res, user: req.user };
  sseClients.add(client);

  // Heartbeat keep-alive every 25 seconds to prevent proxy disconnects
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeatTimer);
      sseClients.delete(client);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    sseClients.delete(client);
  });
};

/**
 * Create a persistent admin cancellation notification
 * Deduplicated at both application and database level
 */
export const recordCancellationAlert = async (order) => {
  if (!order || !order.id) return null;

  const orderId = order.id;
  const customerId = order.user_id || order.user?.id || null;
  const customerName = order.user?.name || 'Customer';
  const customerEmail = order.user?.email || null;
  const orderTotal = Number(order.total_price || order.totalPrice || 0);
  const paymentMethod = order.payment_method || 'online';
  const paymentStatus = order.is_paid ? 'Paid' : 'Unpaid';
  const cancellationStatus = order.status || 'Cancelled';
  const cancelledAt = new Date().toISOString();

  const metadata = {
    orderId,
    customerName,
    customerEmail,
    orderTotal,
    paymentMethod,
    paymentStatus,
    cancellationStatus,
    cancelledAt,
    itemCount: order.order_items?.length || 0
  };

  try {
    // Attempt upsert into PostgreSQL admin_notifications table
    const { data: savedRecord, error: dbError } = await supabase
      .from('admin_notifications')
      .upsert({
        order_id: orderId,
        type: 'order_cancellation',
        customer_id: customerId,
        metadata,
        is_read: false,
        created_at: cancelledAt,
        updated_at: cancelledAt
      }, { onConflict: 'order_id,type', ignoreDuplicates: false })
      .select(`
        *,
        order:orders ( id, status, total_price, payment_method, is_paid, created_at, updated_at ),
        customer:users ( id, name, email )
      `)
      .single();

    if (dbError) {
      console.warn('[ADMIN NOTIFICATION] PostgreSQL upsert warning:', dbError.message);
      // Fallback object for broadcast
      const fallbackRecord = {
        id: `mem-${Date.now()}-${orderId.slice(0, 8)}`,
        type: 'order_cancellation',
        order_id: orderId,
        customer_id: customerId,
        metadata,
        is_read: false,
        created_at: cancelledAt,
        updated_at: cancelledAt,
        order: {
          id: orderId,
          status: cancellationStatus,
          total_price: orderTotal,
          payment_method: paymentMethod,
          is_paid: order.is_paid,
          created_at: order.created_at,
          updated_at: cancelledAt
        },
        customer: {
          id: customerId,
          name: customerName,
          email: customerEmail
        }
      };
      broadcastAdminNotification(fallbackRecord);
      return fallbackRecord;
    }

    // Successfully persisted in database
    broadcastAdminNotification(savedRecord);
    return savedRecord;
  } catch (err) {
    console.error('[ADMIN NOTIFICATION] Failed to record cancellation alert:', err);
    return null;
  }
};

/**
 * Retrieve admin notifications list with unread tally
 * @route   GET /api/admin/notifications
 * @access  Private/Admin
 */
export const getAdminNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const filter = req.query.filter || 'all'; // 'all' or 'unread'

    let query = supabase
      .from('admin_notifications')
      .select(`
        *,
        order:orders ( id, status, total_price, payment_method, is_paid, created_at, updated_at ),
        customer:users ( id, name, email )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filter === 'unread') {
      query = query.eq('is_read', false);
    }

    const { data: dbNotifications, error: dbError } = await query;

    if (dbError) {
      // If table has not yet been migrated, serve from memory cache gracefully
      console.warn('[ADMIN NOTIFICATION] Database fetch warning:', dbError.message);
      const filteredMem = filter === 'unread' 
        ? recentNotificationsBuffer.filter(n => !n.is_read)
        : recentNotificationsBuffer;
      const unreadCount = recentNotificationsBuffer.filter(n => !n.is_read).length;
      return res.json({
        notifications: filteredMem,
        unreadCount,
        source: 'memory_cache'
      });
    }

    // Calculate unread count accurately
    const { count: unreadCount, error: countError } = await supabase
      .from('admin_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);

    const safeUnreadCount = !countError && typeof unreadCount === 'number'
      ? unreadCount
      : (dbNotifications || []).filter(n => !n.is_read).length;

    res.json({
      notifications: dbNotifications || [],
      unreadCount: safeUnreadCount,
      source: 'database'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current unread notification count
 * @route   GET /api/admin/notifications/unread-count
 * @access  Private/Admin
 */
export const getUnreadNotificationCount = async (req, res, next) => {
  try {
    const { count, error } = await supabase
      .from('admin_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);

    if (error) {
      const memCount = recentNotificationsBuffer.filter(n => !n.is_read).length;
      return res.json({ unreadCount: memCount });
    }

    res.json({ unreadCount: count || 0 });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read
 * @route   PUT /api/admin/notifications/:id/read
 * @access  Private/Admin
 */
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // Update in memory buffer
    const memItem = recentNotificationsBuffer.find((n) => n.id === id);
    if (memItem) {
      memItem.is_read = true;
      memItem.read_at = new Date().toISOString();
    }

    if (isUuid) {
      const { data, error } = await supabase
        .from('admin_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return res.json({ success: true, notification: data });
      }
    }

    res.json({ success: true, notification: memItem || { id, is_read: true } });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all admin notifications as read
 * @route   PUT /api/admin/notifications/mark-all-read
 * @access  Private/Admin
 */
export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const now = new Date().toISOString();

    // Mark memory buffer items
    recentNotificationsBuffer.forEach(n => {
      n.is_read = true;
      n.read_at = now;
    });

    const { error } = await supabase
      .from('admin_notifications')
      .update({
        is_read: true,
        read_at: now,
        updated_at: now
      })
      .eq('is_read', false);

    if (error) {
      console.warn('[ADMIN NOTIFICATION] mark-all-read warning:', error.message);
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};
