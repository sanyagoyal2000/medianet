import { PageHeader } from "@/components/studio/PageHeader";
import { Card } from "@/components/studio/Card";

export default function Page() {
  return (
    <>
      <PageHeader title="Overview" subtitle="Contextual relevance, request quality and AI delivery in one workspace." />
      <div className="grid grid-cols-2 gap-5"><Card className="h-48" /><Card className="h-48" /></div>
    </>
  );
}
