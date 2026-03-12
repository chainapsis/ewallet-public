import { Step } from "../../components/step/step";
import { useTECDSA } from "./use_tecdsa";
import styles from "./workflow.module.css";

export const Workflow: FC = () => {
  const {
    handleClickKeygen,
    handleClickTriples,
    handleClickPresign,
    handleClickSign,
    keygenResult,
    triplesResult,
    presignResult,
    signResult,
    keygenError,
    triplesError,
    presignError,
    signError,
  } = useTECDSA();

  return (
    <div className={styles.wrapper}>
      <Step
        label="Keygen"
        handleClick={handleClickKeygen}
        result={keygenResult}
        error={keygenError}
      />
      <Step
        label="Triples"
        handleClick={handleClickTriples}
        result={triplesResult}
        error={triplesError}
      />
      <Step
        label="Presign"
        handleClick={handleClickPresign}
        result={presignResult}
        error={presignError}
      />
      <Step
        label="Sign"
        handleClick={handleClickSign}
        result={signResult}
        error={signError}
      />
    </div>
  );
};
