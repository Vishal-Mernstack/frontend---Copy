import { useEffect, useState } from "react";

const useFetch = (fetcher, dependencies = [], enabled = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!enabled) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const result = await fetcher();
        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Request failed");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error, setData };
};

export default useFetch;
