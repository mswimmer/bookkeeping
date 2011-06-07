function(doc){
    if (doc.type && (doc.type == "expense") && doc.category && doc.amount) {
      emit(doc.category, doc.amount);
   }
}

