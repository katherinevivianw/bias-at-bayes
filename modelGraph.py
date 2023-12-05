import networkx as nx
import matplotlib.pyplot as plt

# Create a directed graph
G = nx.DiGraph()

# Add nodes
G.add_nodes_from(['Female', 'JobSatisfaction', 'MonthlyIncome', 'Overtime', 'Attrition'])

# Add edges
G.add_edges_from([('Female', 'MonthlyIncome'), ('MonthlyIncome', 'JobSatisfaction'), ('Female', 'Overtime'), ('Overtime', 'JobSatisfaction'), ('JobSatisfaction', 'Attrition')])

# Visualize the graph
nx.draw(G, with_labels=True, font_weight='bold', arrowsize=20)
plt.show()