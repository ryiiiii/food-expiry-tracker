export default function PageHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-[22px] font-bold">{title}</h1>
      <p className="text-[13px] text-muted">{subtitle}</p>
    </div>
  );
}
