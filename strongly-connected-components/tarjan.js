function tarjan (spec) {
  let { nodes, links } = spec

  /*
  console.info('in tarjan')
  console.info('nodes:', nodes)
  console.info('links:', links)
  */

  let vertices = nodes.map((element, index) => new Vertex(index.toString()))

  links.forEach((element) => {
    vertices[element[0]].connections.push(vertices[element[2]])
  })


  let graph = new Graph(vertices)
  let t = new Tarjan(graph)

  let scc = t.run()

  return scc

}


function Graph(vertices){
  this.vertices = vertices || [];
}

function Vertex(name){
  this.name = name || null;
  this.connections = [];
  
  // used in tarjan algorithm
  // went ahead and explicity initalized them
  this.index= -1;
  this.lowlink = -1;
}
Vertex.prototype = {
  equals: function(vertex){
      // equality check based on vertex name
      return (vertex.name && this.name==vertex.name);
  }
};

function VertexStack(vertices) {
  this.vertices = vertices || [];
}
VertexStack.prototype = {
  contains: function(vertex){
      for (var i in this.vertices){
          if (this.vertices[i].equals(vertex)){
              return true;
          }
      }
      return false;
  }
};

function Tarjan(graph) {
  this.index = 0;
  this.stack = new VertexStack();
  this.graph = graph;
  this.scc = [];
}
Tarjan.prototype = {
  run: function(){
      for (var i in this.graph.vertices){
          if (this.graph.vertices[i].index<0){
              this.strongconnect(this.graph.vertices[i]);
          }
      }
      return this.scc;
  },
  strongconnect: function(vertex){
      // Set the depth index for v to the smallest unused index
      vertex.index = this.index;
      vertex.lowlink = this.index;
      this.index = this.index + 1;
      this.stack.vertices.push(vertex);
      
      // Consider successors of v
      // aka... consider each vertex in vertex.connections
      for (var i in vertex.connections){
          var v = vertex;
          var w = vertex.connections[i];
          if (w.index<0){
              // Successor w has not yet been visited; recurse on it
              this.strongconnect(w);
              v.lowlink = Math.min(v.lowlink,w.lowlink);
          } else if (this.stack.contains(w)){
              // Successor w is in stack S and hence in the current SCC
              v.lowlink = Math.min(v.lowlink,w.index);
          }
      }
      
      // If v is a root node, pop the stack and generate an SCC
      if (vertex.lowlink==vertex.index){
          // start a new strongly connected component
          var vertices = [];
          var w = null;
          if (this.stack.vertices.length>0){
              do {
                  w = this.stack.vertices.pop();
                  // add w to current strongly connected component
                  vertices.push(w);
              } while (!vertex.equals(w));
          }
          // output the current strongly connected component
          // ... i'm going to push the results to a member scc array variable
          if (vertices.length>0){
              this.scc.push(vertices);
          }
      }
  }
}

export { tarjan }