import { redirect } from "next/navigation";
import { consultar } from "@/lib/db";
import { usuarioAtual } from "@/lib/permissions";
import { GestaoColetivo } from "@/components/gestao-coletivo";

type Membro = {
  id: string;
  nome: string;
  email: string;
  papel: "lideranca" | "assessor";
  ativo: boolean;
};

export default async function ColetivoPage() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.papel !== "lideranca") redirect("/app");

  const membros = await consultar<Membro>(
    "SELECT id, nome, email, papel, ativo FROM usuarios ORDER BY papel, nome",
  );

  return <GestaoColetivo membros={membros} />;
}
