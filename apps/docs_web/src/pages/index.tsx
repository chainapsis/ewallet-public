import { useHistory } from "@docusaurus/router";
import { type JSX, useEffect } from "react";

export default function Home(): JSX.Element {
  const history = useHistory();

  useEffect(() => {
    history.replace("/docs");
  }, [history]);

  return null;
}
