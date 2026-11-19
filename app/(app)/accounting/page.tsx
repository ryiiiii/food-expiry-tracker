import ExpenseList from "@/components/ExpenseList";
import PageHeading from "@/components/ui/PageHeading";

export default function AccountingPage() {
  return (
    <main className="flex flex-col gap-4 px-5 pt-2 pb-6">
      <PageHeading title="家計管理" subtitle="支出を記録・集計する" />
      <ExpenseList />
    </main>
  );
}
