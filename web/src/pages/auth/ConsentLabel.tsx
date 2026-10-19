import classes from "./auth.module.css";

/** Texto da concordância (LGPD); a política abre em outra aba para não perder o que foi preenchido. */
export function ConsentLabel() {
  return (
    <>
      Li e concordo com o{" "}
      <a href="/privacidade" target="_blank" rel="noopener" className={classes.inlineLink}>
        uso dos meus dados
      </a>{" "}
      para atendimento pela prefeitura.
    </>
  );
}
