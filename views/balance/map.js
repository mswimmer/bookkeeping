function(doc){
  var factor = 0;
  if (doc.type && (doc.type == "expense") && doc.date && doc.category && doc.amount) {
    factor = -1.0;
    emit ([doc.date, doc.category], doc.amount * factor);
  } else if (doc.type && (doc.type == "income") && doc.date && doc.amount && doc.category) {
    factor = 1.0;
    emit ([doc.date, doc.category], doc.amount * factor);
  }
}
