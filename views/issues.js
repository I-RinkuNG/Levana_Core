KeshViews.issues = {
  skel: ["issues", [["ISSUES", "issues", 2]]],
  load: async () => null,
  render: () => ({ h1: "issues", nodes: [KeshUI.empty({ title: "กำลังพัฒนา" })] })
};
KeshViews.issue = KeshViews.issues;
