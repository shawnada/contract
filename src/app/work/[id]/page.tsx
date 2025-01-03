import { ScrollArea } from "@/components/ui/scroll-area";
import { getDoc } from "./action";
import Title from "./title";
import OnlyOfficeEditor from "./onlyoffice-editor";
import { EditorProvider } from "./editor-context";

export default async function WorkPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const doc = await getDoc(id);

  if (doc == null)
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>找不到文档...</p>
      </div>
    );

  return (
    <EditorProvider>
      <div className="flex flex-col h-full">
        <div className="flex-none">
          <Title id={id} title={doc.title} />
        </div>
        <div className="flex-1 overflow-hidden">
          <OnlyOfficeEditor
            id={id}
            content={doc.content}
            version={doc.version}
          />
        </div>
      </div>
    </EditorProvider>
  );
}
