import { OkoProvider } from "@/components/oko_provider/oko_provider";
import { PreviewPanel } from "@/components/preview_panel/preview_panel";

export const Home = () => {
  return (
    <OkoProvider>
      <PreviewPanel />
    </OkoProvider>
  );
};
