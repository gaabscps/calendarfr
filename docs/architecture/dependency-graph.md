flowchart LR

subgraph 0["scripts"]
subgraph 1["agentops"]
subgraph 2["__tests__"]
3["anchor.integration.test.ts"]
Q["enrich.test.ts"]
R["flow-report.test.ts"]
T["index-report.test.ts"]
U["index.integration.test.ts"]
W["insights.test.ts"]
X["measure.test.ts"]
Y["parse.test.ts"]
Z["scan.test.ts"]
end
8["enrich.ts"]
subgraph 9["enrich"]
A["dispatches.ts"]
B["guards.ts"]
C["phases.ts"]
D["status.ts"]
end
E["insights.ts"]
F["constants.ts"]
G["measure.ts"]
subgraph H["measure"]
I["cost.ts"]
J["dispatches.ts"]
K["findings.ts"]
L["timing.ts"]
end
M["parse.ts"]
subgraph N["render"]
O["index-report.ts"]
S["flow-report.ts"]
end
P["scan.ts"]
V["index.ts"]
10["types.ts"]
end
end
subgraph 4["fs"]
5["promises"]
end
6["os"]
7["path"]
subgraph 11["server"]
subgraph 12["src"]
13["index.ts"]
subgraph 14["lib"]
15["app.ts"]
end
subgraph 16["routes"]
17["health.ts"]
end
end
end
subgraph 18["test-utils"]
19["index.ts"]
subgraph 1A["msw"]
1B["index.ts"]
1C["server.ts"]
1D["handlers.ts"]
end
1E["render.tsx"]
end
subgraph 1F["@"]
subgraph 1G["shared"]
subgraph 1H["components"]
1I["theme"]
1M["PaperSheet"]
end
end
1U["test-utils"]
end
subgraph 1J["web"]
subgraph 1K["src"]
1L["App.tsx"]
subgraph 1N["__tests__"]
1O["sanity.test.ts"]
end
1P["main.tsx"]
subgraph 1Q["shared"]
subgraph 1R["components"]
subgraph 1S["PaperSheet"]
1T["PaperSheet.integration.test.tsx"]
1V["PaperSheet.tsx"]
1W["PaperSheet.module.css"]
1X["PaperSheet.stories.tsx"]
1Y["PaperSheet.test.tsx"]
1Z["index.ts"]
end
subgraph 20["theme"]
21["GlobalStyles.tsx"]
22["tokens.ts"]
23["index.ts"]
end
end
end
24["vite-env.d.ts"]
end
end
3-->8
3-->E
3-->G
3-->M
3-->O
3-->P
3-->4
3-->5
3-->6
3-->7
8-->A
8-->B
8-->C
8-->D
A-->B
C-->B
D-->B
E-->F
G-->I
G-->J
G-->K
G-->L
I-->F
M-->5
M-->7
P-->4
P-->7
Q-->8
Q-->M
Q-->7
R-->8
R-->E
R-->G
R-->M
R-->S
R-->7
S-->F
T-->8
T-->E
T-->G
T-->M
T-->O
T-->7
U-->V
U-->5
U-->6
U-->7
V-->8
V-->E
V-->G
V-->M
V-->S
V-->O
V-->P
V-->4
V-->7
W-->E
X-->8
X-->G
X-->M
X-->7
Y-->M
Y-->5
Y-->6
Y-->7
Z-->P
Z-->5
Z-->6
Z-->7
13-->15
15-->17
19-->1B
19-->1E
1B-->1C
1C-->1D
1E-->1I
1L-->1M
1P-->1L
1P-->1I
1T-->1V
1T-->1U
1V-->1W
1X-->1V
1Y-->1V
1Z-->1V
21-->22
23-->21
23-->22
