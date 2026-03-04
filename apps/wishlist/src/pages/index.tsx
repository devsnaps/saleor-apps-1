import { type NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";

const IndexPage: NextPage = () => {
  const { replace } = useRouter();

  useEffect(() => {
    void replace("/configuration");
  }, [replace]);

  return <span>Loading...</span>;
};

export default IndexPage;
