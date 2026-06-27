declare module "react-rte" {
  import type { ComponentType } from "react";

  export type EditorValue = {
    toString(format: "html" | "markdown" | "raw"): string;
  };

  type RichTextEditorProps = {
    value: EditorValue;
    onChange: (value: EditorValue) => void;
    placeholder?: string;
    readOnly?: boolean;
  };

  type RichTextEditorComponent = ComponentType<RichTextEditorProps> & {
    createValueFromString(value: string, format: "html" | "markdown" | "raw"): EditorValue;
  };

  const RichTextEditor: RichTextEditorComponent;
  export default RichTextEditor;
}
