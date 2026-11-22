import ShoppingList from "@/components/ShoppingList";
import PageHeading from "@/components/ui/PageHeading";

export default function ShoppingPage() {
  return (
    <main className="flex flex-col gap-5 px-5 pt-2">
      <PageHeading
        title="買い物リスト"
        subtitle=""
      />
      <ShoppingList />
    </main>
  );
}
