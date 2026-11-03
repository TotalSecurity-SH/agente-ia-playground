import { ToolHero } from "@/components/ToolHero";
import Playground from "@/components/Playground";

export default function Page() {
  return (
    <>
      <ToolHero
        slug="agente-ia"
        title={
          <>
            Prueba un <span className="text-teal">agente de IA</span> para tu negocio
          </>
        }
        subtitle="Configura los datos de tu negocio y chatea con el agente como si fueras un cliente. Responde dudas, agenda citas o toma pedidos y entrega los datos listos para tu CRM."
        chips={["Estilo WhatsApp", "Plantillas por giro", "Captura de datos", "Prompt visible"]}
      />
      <Playground />
    </>
  );
}
