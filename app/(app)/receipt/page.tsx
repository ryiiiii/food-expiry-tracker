import ReceiptScanner from "@/components/ReceiptScanner";
import PageHeading from "@/components/ui/PageHeading";

export default function ReceiptPage() {
  return (
    <main className="flex flex-col gap-4 px-5 pt-2 pb-6">
      <PageHeading
        title="レシート読取"
        subtitle=""
      />
      <ReceiptScanner />
    </main>
  );
}
