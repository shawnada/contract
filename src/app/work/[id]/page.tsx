import { ScrollArea } from "@/components/ui/scroll-area";
import { getDoc } from "./action";
import Title from "./title";
import Content from "./content";
import CanvasContent from "./canvas-content";
import { EditorProvider } from "./editor-context";

export default async function OneWork({ params }: { params: { id: string } }) {
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
      <ScrollArea className="h-[calc(100vh-46px)]">
        <div className="max-w-[900px] ml-10 my-4">
          <Title id={id} title={doc.title} />
          <div className="mt-4">
            <CanvasContent id={id} content={doc.content} />
          </div>
        </div>
      </ScrollArea>
    </EditorProvider>
  );
}
