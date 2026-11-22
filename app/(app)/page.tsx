import FoodList from "@/components/FoodList";
import PageHeading from "@/components/ui/PageHeading";

export default function Home() {
  return (
    <main className="flex flex-col gap-4 px-5 pt-2">
      <PageHeading
        title="食品管理"
        subtitle=""
      />
      <FoodList />
    </main>
  );
}
