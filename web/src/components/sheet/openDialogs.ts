/**
 * Outra folha nativa ou diálogo modal aberto (ex.: Solicitar): a Novidade e a
 * oferta do passeio esperam a vez, e o passeio pausa atrás da folha. O cartão
 * do passeio é aria-modal="false" e não conta.
 */
export function anotherDialogOpen(root: Pick<ParentNode, "querySelector"> = document): boolean {
  return root.querySelector("dialog[open], [role='dialog'][aria-modal='true']") !== null;
}
