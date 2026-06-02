import ExpenseList from "@/components/ExpenseList";

export default function AccountingPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">💰 家計管理</h1>
        <p className="text-sm text-gray-500 mt-1">支出を記録・集計する</p>
      </div>
      <ExpenseList />
    </main>
  );
}
