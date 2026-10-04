import jamStrawberry from '../assets/images/jam_strawberry.jpg';
import jamBlueberry from '../assets/images/jam_blueberry.jpg';
import jamPeach from '../assets/images/jam_peach.jpg';
import jamFig from '../assets/images/jam_fig.jpg';

export const products = [
  {
    id: 'p1',
    name: 'Organic Strawberry Jam',
    shortDescription: 'Classic sweet strawberry jam.',
    description: 'Handcrafted in small batches using only the finest organic strawberries. This classic preserve captures the essence of early summer, offering a bright, sweet flavor that pairs perfectly with warm scones or fresh brioche.',
    price: 12.99,
    weight: '340g',
    rating: 4.8,
    reviews: 124,
    ingredients: ['Organic Strawberries', 'Cane Sugar', 'Fruit Pectin', 'Lemon Juice'],
    benefits: ['100% Organic', 'No Artificial Preservatives', 'Vegan', 'Gluten-Free'],
    image: jamStrawberry,
    category: 'Classic',
  },
  {
    id: 'p2',
    name: 'Wild Blueberry Preserve',
    shortDescription: 'Rich, intense wild blueberries.',
    description: 'Made with wild-harvested blueberries for a deeper, more intense flavor profile. Slightly tart and beautifully complex, this preserve elevates everything from morning yogurt to evening cheese boards.',
    price: 14.50,
    weight: '340g',
    rating: 4.9,
    reviews: 89,
    ingredients: ['Wild Blueberries', 'Organic Cane Sugar', 'Fruit Pectin', 'Lemon Juice'],
    benefits: ['Rich in Antioxidants', 'Wild Harvested', 'Vegan', 'Gluten-Free'],
    image: jamBlueberry,
    category: 'Wild',
  },
  {
    id: 'p3',
    name: 'Orchard Peach Marmalade',
    shortDescription: 'Sun-ripened peaches with a zest.',
    description: 'A vibrant blend of sun-ripened orchard peaches with a subtle hint of citrus zest. This marmalade brings sunshine to your breakfast table and works beautifully as a glaze for savory dishes.',
    price: 11.99,
    weight: '340g',
    rating: 4.7,
    reviews: 56,
    ingredients: ['Organic Peaches', 'Cane Sugar', 'Orange Zest', 'Fruit Pectin', 'Lemon Juice'],
    benefits: ['100% Organic', 'Locally Sourced Peaches', 'Vegan', 'Gluten-Free'],
    image: jamPeach,
    category: 'Marmalade',
  },
  {
    id: 'p4',
    name: 'Fig & Local Honey Jam',
    shortDescription: 'Earthy figs sweetened with local honey.',
    description: 'An elegant pairing of earthy, ripe figs and sweet local honey. This sophisticated jam is a must-have for any charcuterie board and pairs exquisitely with aged cheeses and prosciutto.',
    price: 16.99,
    weight: '340g',
    rating: 5.0,
    reviews: 210,
    ingredients: ['Fresh Figs', 'Local Raw Honey', 'Cane Sugar', 'Fruit Pectin', 'Lemon Juice'],
    benefits: ['Artisanal Honey', 'Small Batch', 'Vegetarian', 'Gluten-Free'],
    image: jamFig,
    category: 'Artisanal',
  }
];
