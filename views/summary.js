KeshViews.summary = (() => {
  const { h } = KeshUI, A = KeshApi;
  return {
    skel: ["สรุป"],
    load: async () => ({ w: await A.ws() }),
    render: ({ w }) => ({ h1: "สรุป", nodes: [h("p", { className: "meta" }, w.runs.length + " runs · " + w.issues.length + " issues")] })
  };
})();
