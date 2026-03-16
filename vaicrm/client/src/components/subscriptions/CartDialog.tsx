import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Trash2 } from "lucide-react";

interface CartDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDialog({ isOpen, onClose }: CartDialogProps) {
  const cart = useCart();
  const { toast } = useToast();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            <span>Shopping Cart ({cart.itemCount} items)</span>
          </DialogTitle>
          <DialogDescription>Review and checkout your selected services</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {cart.items.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
              <p className="text-sm text-gray-400">Add services using the Quick Actions</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline" className="text-xs">{item.type.replace('_', ' ').toUpperCase()}</Badge>
                          <span className="text-sm text-gray-600">Customer: {item.customerId}</span>
                        </div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                        {item.duration && <p className="text-sm text-gray-500 mt-1">Duration: {item.duration}</p>}
                        <div className="text-lg font-semibold text-blue-600 mt-2">
  {item.currency || ''} {item.price.toLocaleString()}
</div>
                        <div className="text-xs text-gray-500">Added on {item.addedAt.toLocaleString()}</div>
                      </div>
                      <Button variant="ghost" size="xs" onClick={() => cart.removeItem(item.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">
  {cart.items[0]?.currency || ''} {cart.totalAmount.toLocaleString()}
</span>
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <Button size="xs" variant="outline" onClick={() => cart.clearCart()} className="flex-1">Clear Cart</Button>
                <Button
                  size="xs"
                  onClick={() => {
                    toast({ 
  title: "Checkout Initiated", 
  description: `Processing ${cart.itemCount} items totaling ${cart.items[0]?.currency || ''} ${cart.totalAmount.toLocaleString()}` 
});
                    cart.clearCart();
                    onClose();
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Checkout All Items
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}