import SubmitButton from "./submit-button";
import { setWishlist } from "@/app/actions/wishlist";

type WishlistButtonProps = {
  productId: string;
  isWishlisted: boolean;
};

export default function WishlistButton({
  productId,
  isWishlisted,
}: WishlistButtonProps) {
  return (
    <form action={setWishlist}>
      <input type="hidden" name="productId" value={productId} />

      <input
        type="hidden"
        name="intent"
        value={isWishlisted ? "remove" : "save"}
      />

      <SubmitButton>{isWishlisted ? "♥ Remove from wishlist" : "♡ Save to wishlist"}</SubmitButton>
    </form>
  );
}
