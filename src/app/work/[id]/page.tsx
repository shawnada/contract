import { ScrollArea } from "@/components/ui/scroll-area";
import { getDoc } from "./action";
import Title from "./title";
import OnlyOfficeEditor from "./onlyoffice-editor";
import { EditorProvider } from "./editor-context";
import { revalidatePath } from "next/cache";

export default async function WorkPage({ params }: { params: { id: string } }) {
  const doc = await getDoc(params.id);
  if (!doc) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none">
        <Title id={params.id} title={doc.title} />
      </div>
      <div className="flex-1 overflow-hidden">
        <OnlyOfficeEditor
          id={params.id}
          content={doc.content}
          version={doc.version}
        />
      </div>
    </div>
  );
}
