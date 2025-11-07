import ProductCard from '../ProductCard';
import khussaImage from '@assets/generated_images/Handmade_khussa_footwear_product_06baa0d0.png';

export default function ProductCardExample() {
  return (
    <div className="max-w-sm">
      <ProductCard
        id="1"
        title="Handcrafted Multani Blue Pottery Vase"
        price={3500}
        image={khussaImage}
        district="Multan"
        giBrand="Multani Crafts"
        vendorName="Ahmad Pottery Works"
      />
    </div>
  );
}
