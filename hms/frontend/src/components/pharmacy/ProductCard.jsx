import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, ShoppingCart, Heart } from "lucide-react";

const productImages = [
  "/products/apple_chocolate_delight/apple_chocolate_1.png",
  "/products/apple_chocolate_delight/apple_chocolate_2.png",
  "/products/apple_chocolate_delight/apple_chocolate_3.png",
  "/products/apple_chocolate_delight/apple_chocolate_4.png",
  "/products/apple_chocolate_delight/apple_chocolate_5.png",
];

export default function ProductCard({ product = {
  id: 1,
  name: "Apple Chocolate Delight",
  description: "Luxury dark chocolate filled with apple caramel and topped with fruit cubes. A perfect blend of richness and fruity sweetness.",
  price: 8.99,
  originalPrice: 10.99,
  rating: 4.9,
  reviews: 256,
  inStock: true,
  category: "Chocolates",
} }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  return (
    <Card className="w-full max-w-sm overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-amber-900/30 hover:shadow-2xl hover:shadow-amber-900/20 transition-all duration-500 group">
      {/* Image Gallery */}
      <div className="relative h-72 bg-gradient-to-b from-amber-950/20 to-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
        <img
          src={productImages[currentImageIndex]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            e.target.src = "/placeholder-image.png";
          }}
        />
        
        {/* Image Navigation */}
        {productImages.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-amber-900/80 border-amber-700/50 text-white backdrop-blur-sm z-20"
              onClick={prevImage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-amber-900/80 border-amber-700/50 text-white backdrop-blur-sm z-20"
              onClick={nextImage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Image Indicators */}
        {productImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {productImages.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentImageIndex 
                    ? "bg-amber-400 w-6" 
                    : "bg-white/30 hover:bg-white/50"
                }`}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </div>
        )}

        {/* Favorite Button */}
        <Button
          variant="outline"
          size="icon"
          className={`absolute top-3 right-3 bg-black/60 hover:bg-amber-900/80 border-amber-700/50 text-white backdrop-blur-sm z-20 transition-all ${
            isFavorite ? "text-rose-400 border-rose-400" : ""
          }`}
          onClick={() => setIsFavorite(!isFavorite)}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
        </Button>

        {/* Stock Badge */}
        {!product.inStock && (
          <div className="absolute top-3 left-3 bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-semibold z-20">
            Out of Stock
          </div>
        )}
      </div>

      {/* Product Info */}
      <CardContent className="p-5 space-y-4 bg-gradient-to-b from-gray-900 to-black">
        {/* Category */}
        <div className="text-xs text-amber-400 uppercase tracking-widest font-semibold">
          {product.category}
        </div>

        {/* Name */}
        <h3 className="text-xl font-bold text-white line-clamp-2 group-hover:text-amber-400 transition-colors">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`h-4 w-4 ${
                  i < Math.floor(product.rating) ? "text-amber-400" : "text-gray-600"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-sm text-gray-400">
            {product.rating} ({product.reviews} reviews)
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-amber-400">
            ${product.price.toFixed(2)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-gray-500 line-through">
              ${product.originalPrice.toFixed(2)}
            </span>
          )}
          {product.originalPrice && (
            <span className="text-xs bg-amber-900/50 text-amber-400 px-3 py-1 rounded-full border border-amber-700/30">
              {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold border-amber-500/50"
            disabled={!product.inStock}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {product.inStock ? "Add to Cart" : "Out of Stock"}
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            className="border-amber-700/50 text-amber-400 hover:bg-amber-900/30"
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
