import ShoppingList from "@/components/ShoppingList";

export default function ShoppingPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🛒 買い物リスト</h1>
        <p className="text-sm text-gray-500 mt-1">消費した食品から提案、またはご自身で追加できます</p>
      </div>
      <ShoppingList />
    </main>
  );
}
