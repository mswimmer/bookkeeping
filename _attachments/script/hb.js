$.couch.app(function(app) {
        var dbname = document.location.href.split('/')[3];
        var design = unescape(document.location.href).split('/')[5];
        var DB = $.couch.db(dbname);
        var Months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        var today = new Date();
        var load_ref = 0;

        $("#tabs").tabs();

        function load(){
            load_ref = load_ref + 1;
            $( "#loader" ).show();
        }

        function ready() {
            if (load_ref > 0){
                load_ref = load_ref - 1;
            }
            if (load_ref === 0 ){
                $("#loader").hide();
            }
        }

        function getCategories(id){
            DB.view(design+"/available_categories?group=true",
                    {success: function(json) {
                            var categories = json.rows.map(function(c) { return c.key; });
                            ready();
                            $( id ).autocomplete({source : categories });
                        }});
        }

        function addEntry(title, form_id, kind, date, success, cancel) {
            var form = '<form id="'+ form_id + '">' +
                '<h2>'+ title + " - " + $(date).val() + '</h2>' +
                '<table>'+
                '<tr><td><input type="text" size="15" name="category" id="category"></td>' +

                '<td><input type="text" size="10" name="amount" id="amount"></td>' +
                '<td><input type="text" size="50" name="comment" id="comment"></td>' +
                '<td><input type="button" value="Cancel" id="cancel-form'+ form_id +'"></td>' +
                '<td><input type="submit" value="Accept &rarr;"></td></tr>' +
                '<tr><th>Category</th><th>Amount</th><th>Comment</th></tr></table>' +
                '</form>';
            load();
            $('#' + form_id ).html(form);
            getCategories("#category");

            var docdate = $( date ).val().split("-").map(function(e){return Number(e);});
            var editfrom = app.docForm('form#' + form_id , {
                    fields : [ "comment", "amount", "category", "type" ],
                    template : { "date" : docdate, "amount" : 0, "type" : kind, "comment" : "" },
                    beforeSave  : function(doc) {
                        var b = Number(doc.amount);
                        if (b == "NaN") {throw ({error : "The amount is not a number"});}
                        else {doc.amount = b;}
                        doc.category = doc.category.toLowerCase();
                        load();
                    },
                    success : function( response ){ success( response ); }
                });
            $('#cancel-form' + form_id ).live('click', function(){ cancel(); });
        }

        function addExpense( e ) {
            addEntry("New expense", e.attr("id"), "expense","#date-" + e.attr("id"),
                     function(response) {
                         ready();
                         e.text('');
                         render_day("date-" + e.attr("id"), $("#date-" + e.attr("id")).val().split("-"));
                         render_month("date-" + e.attr("id"), $("#date-" + e.attr("id")).val().split("-"));
                         graph_monthly_expenses([today.getFullYear(), today.getMonth() + 1, today.getDate()]);
                     },
                     function() {
                         e.text('');
                         render_day("date-" + e.attr("id"),$("#date-" + e.attr("id")).val().split("-"));
                     });
        }

        function addIncome() {
            addEntry("New income entry", "new-income", "income", "#date-monthly-income",
                     function(response) {
                         ready();
                         $("#new-income").text('');
                         render_month("date-monthly-income", $("#date-monthly-income").val().split("-"));
                         graph_monthly_expenses([today.getFullYear(), today.getMonth() + 1, today.getDate()]);
                     },
                     function() {
                         $("#new-income").text('');
                         render_day("date-monthly-income", $("#date-monthly-income").val().split("-"));
                     });
        }

        function editEntry(id, kind){

            var value = 0;
            var comment = "";
            var date = [ ];

            date = $("#" + id + "-date").text().slice(0).split("-");
            value = $("#" + id + "-value").text().slice(0);
            comment = $("#" + id + "-comment").text().slice(0);

            $("#"+ id + "-comment").html('<form id="' + kind + '-' + id +'" method="post"><input type="text" size="15" id="comment-' + id + '" value="' + comment +'">');
            $("#"+ id + "-value").html('<input type="text" size="15" id="amount-' + id +'" value="' + value + '">');
            $("#edit-" + kind+ "-" + id).html('<span id="submit-' + id + '" class="ui-icon ui-icon-circle-check"></form>');
            $("#cancel-" + kind + "-" + id).html('<span class="ui-icon ui-icon-circle-close"></span>');
            $("#edit-"+ kind + "-" + id).click( function() { $("form#" + kind + "-" + id).submit(); });
            $("#cancel-" + kind + "-" + id).click( function() {
                    $("#" + id + "-comment").text(comment);
                    $("#" + id + "-value").text(Number(value).toFixed(2));
                    $("#cancel-" + kind + "-" + id).text("");
                    $("#edit-" + kind+ "-" + id).html('<span class="ui-icon ui-icon-pencil"></span>');
                });

            var editfrom = app.docForm('form#' + kind + '-' + id, {

                    id: id,
                    fields : [],
                    template : { "date" : date, "type" : kind },
                    beforeSave  : function(doc) {
                        var b = Number($("#amount-" + id).val());
                        if (b == "NaN") {throw ({error : "Betrag ist keine Zahl"});}
                        else {doc.amount = b;}
                        doc.comment = $("#comment-" + id).val();
                        doc.category = doc.category.toLowerCase();
                        load();
                    },
                    success : function( response ) {
                        ready();
                        if (kind == "expense"){
                            render_day($("date-daily", "#date-daily-" + kind).val().split("-"));
                        }
                        render_month("date-monthly", $("#date-monthly-" + kind).val().split("-"));
                    }
                });
        }

        function deleteEntry( id ){
            $("#dialog-confirm-text").html("</center>Do you really want to delete the entry of <br/>" + $("#"+id+"-date").text() +"<br/>" +
                                           $("#"+ id + "-comment").text() +"<br/>?</center>");
            $("#dialog-confirm").dialog({
                    resizable: false,
                        height:240,
                        modal: true,
                        buttons: {
                        'Delete it!': function() {
                            load();
                            $.ajax({ url : "/" + dbname + "/" + id,
                                        data : "",
                                        success : function(data){
                                        var rev = data._rev;
                                        $.ajax({ type : "DELETE",
                                                    url: "/" + dbname + "/" + id + "?rev=" + rev,
                                                    success: function( m ){
                                                    ready();
                                                    $("#row-"+id).remove();
                                                    graph_monthly_expenses([today.getFullYear(), today.getMonth() + 1, today.getDate()]);} });},
                                        dataType : "json"});

                            $(this).dialog('close');
                        },
                            'No': function() {
                            $(this).dialog('close');
                        }
                    }
                });

        }

        function render_income(startdate, enddate, e, s){
            var header_rows = [];
            var data_rows = [];
            var total_income = 0;
            var res = {};
            var toggle = 1;

            load();
            $( e ).fadeOut( 500 );
            s.fadeOut( 500 );
            DB.view(design+"/income?startkey=[[" + startdate.join(",") + "],\"\"];endkey=[[" + enddate.join(",") + "],\"\"]",{success: function(json) {
                        data_rows = json.rows.map(function(row) {
                                r = [];
                                k = [];
                                id = row.key[2];
                                r.push('<td class="value"><div id="' + id + '-value">' + row.value.amount.toFixed(2) + '</div></td>');
                                k.push(row.value.comment);
                                total_income = total_income + row.value.amount;
                                toggle = toggle ? 0 : 1;
                                return '<tr class="row' + toggle +'" id="row-' + id +'"><td id="'+ id + '-date">' +
                                row.key[0].join('-') + '</td><td><div id="' + id + '-comment">' +
                                k.join(",") +'</div></td>' + r.join('') +
                                '<td><div id="edit-income-' + id + '"><span class="ui-icon ui-icon-pencil"></span></div></td>' +
                                '<td><div id="cancel-income-' + id + '"></div></td>' +
                                '<td><div id="delete-' + id + '"><span class="ui-icon ui-icon-trash"></div></td></tr>';
                            });

                        ready();
                        $( e ).html( header_rows + data_rows.join('') + '<td colspan="4"><hr></td>' +
                                     '<td><div id="new-income-dialog" rel="edit-new-income"><span class="ui-icon ui-icon-circle-plus"></span></div></td>');
                        s.html( '<tr><td>Total income</td><td>' +
                                '<td class="value">' + total_income.toFixed(2) + '</td></tr>');
                        $( e ).fadeIn( 100 );
                        s.fadeIn( 100 );
                    }});
        }

        function render_expenses(startdate, enddate, e, s, dialog_id){
            var header_rows = [];
            var data_rows = [];
            var categories = [];
            var total_expenses = 0;
            var res = {};
            var toggle = 1;

            load();
            $( e ).fadeOut( 500 );
            s.fadeOut( 500 );

            DB.view(design+"/available_categories?group=true",
                    {success: function(json) {

                            categories = json.rows.map(function(c) { return {name : c.key , total : 0};});
                            categories.Comment = 0; // TODO: capital C???
                            header_rows = '<tr id="header-row"><th></th>' + '<th>Comment</th>' + categories.map(function(e) {
                                    return '<th>' + e.name + '</th>';}).join(' ') +
                                '<td><div id="' + dialog_id + '" rel="edit-new-expense"><span class="ui-icon ui-icon-circle-plus"></span></div></td>' + '</tr>';


                            DB.view(design+"/expenses?startkey=[[" + startdate.join(",") + "]];endkey=[[" + enddate.join(",") + "]]",
                                    {success: function(json) {
                                            data_rows = json.rows.map(function(row) {
                                                    r = [];
                                                    k = [];
                                                    id = row.key[2];
                                                    categories.forEach(function(c) {
                                                            if (row.key[1] == c.name){
                                                                r.push('<td class="value"><div id="' + id + '-value">' + row.value.amount.toFixed(2) + '</div></td>');
                                                                k.push(row.value.comment);
                                                                c.total += row.value.amount;
                                                            } else {
                                                                r.push('<td></td>');
                                                            }
                                                        });
                                                    toggle = toggle ? 0 : 1;
                                                    return '<tr class="row' + toggle + '" id="row-' + id +'"><td id="'+ id + '-date">' +
                                                    row.key[0].join('-') + '</td><td><div id="' + id + '-comment">' +
                                                    k.join(",") +'</div></td>' + r.join('') +
                                                    '<td><div id="edit-expense-' + id + '"><span class="ui-icon ui-icon-pencil"></span></div></td>' +
                                                    '<td><div id="cancel-expense-' + id + '"></div></td>' +
                                                    '<td><div id="delete-' + id + '"><span class="ui-icon ui-icon-trash"></div></td></tr>';
                                                });
                                            sums = '<tr><td>Total of entries</td><td>' +
                                                categories.map( function (c) {
                                                        if (c.total > 0) {
                                                            total_expenses = total_expenses + c.total;
                                                            return '<td class="value">' + c.total.toFixed(2) + '</td>';
                                                        } else {
                                                            return '<td></td>';
                                                        }}).join('') + '</tr>';

                                            ready();
                                            $( e ).html( header_rows + data_rows.join('') + ((data_rows.length > 30)? header_rows : "") + sums);
                                            s.html('<tr><td>Total expenses</td><td class="value">' + total_expenses.toFixed(2) + '</td></tr>');
                                            $( e ).fadeIn( 100 );
                                            s.fadeIn( 100 );
                                        }});
                        }});
        }

        function render_day(datefield, date){
            var date1 = date.map(function(e){return Number(e);}).slice(0);
            var date2 = date.map(function(e){return Number(e);}).slice(0);
            var months = [ 31,28,31,30,31,30,31,31,30,31,30,31,30,31];
            date2[2] = date2[2]+1;
            var res = render_expenses( date1, date2, "#expenses", $("#balance"), "new-daily-expense-dialog" );
            $('#next-day').unbind();
            $('#next-day' ).bind( 'click',
                                  function(event){
                                      var newdate = date.map(function(e){return Number(e);}).splice(0);
                                      if (newdate[2] + 1 > months[newdate[1]]){
                                          newdate[2] = 1;
                                          if (newdate[1] + 1 > 12){
                                              newdate[0] = newdate[0] + 1;
                                              newdate[1] = 1;
                                          }else {
                                              newdate[1] = newdate[1] + 1;
                                          }
                                      } else {
                                          newdate[2] = newdate[2] + 1;
                                      }
                                      $("#" + datefield).val(newdate.join("-"));
                                      event.stopImmediatePropagation();
                                      render_day(datefield, newdate);
                                  });
            $('#prev-day').unbind();
            $('#prev-day' ).bind( 'click',
                                  function(event){
                                      var newdate = date.map(function(e){return Number(e);}).splice(0);
                                      if (newdate[2] - 1 === 0){
                                          newdate[2] = months[newdate[1]];
                                          if (newdate[1] - 1 === 0){
                                              newdate[0] = newdate[0] - 1;
                                              newdate[1] = 31;
                                          }else {
                                              newdate[1] = newdate[1] - 1;
                                          }
                                      } else {
                                          newdate[2] = newdate[2] - 1;
                                      }
                                      $("#" + datefield).val(newdate.join("-"));
                                      event.stopImmediatePropagation();
                                      render_day(datefield, newdate);

                                  });

        }

        function render_month(datefield,date){
            var date1 = date.map(function(e){return Number(e);}).slice(0);
            var date2 = date.map(function(e){return Number(e);}).slice(0);
            date1[2] = 1;
            date2[2] = 32;
            render_income( date1, date2, "#income", $("#income-total") );
            var res = render_expenses( date1, date2, "#month", $("#monthly_balance"), "new-monthly-expense-dialog" );
            $('#next-month').unbind();
            $('#next-month' ).bind( 'click',
                                    function(event){
                                        var newdate = date.map(function(e){return Number(e);}).splice(0);
                                        if (newdate[1] + 1 > 12){
                                            newdate[0] = newdate[0] + 1;
                                            newdate[1] = 1;
                                        } else {
                                            newdate[1] = newdate[1] + 1;
                                        }
                                        $("#" + datefield).val(newdate.join("-"));
                                        event.stopImmediatePropagation();
                                        render_month(datefield, newdate);
                                    });
            $('#prev-month').unbind();
            $('#prev-month' ).bind( 'click',
                                    function(event){
                                        var newdate = date.map(function(e){return Number(e);}).splice(0);
                                        if (newdate[1] - 1 === 0){
                                            newdate[0] = newdate[0] - 1;
                                            newdate[1] = 12;
                                        } else {
                                            newdate[1] = newdate[1] - 1;
                                        }
                                        $("#" + datefield).val(newdate.join("-"));
                                        event.stopImmediatePropagation();
                                        render_month(datefield, newdate);
                                    });

        }
        render_month("date-monthly-expense", [today.getFullYear(), today.getMonth() + 1, today.getDate()]);
        render_day("date-daily-expense", [today.getFullYear(), today.getMonth() + 1, today.getDate()]);

        $("#new-daily-expense-dialog").live('click', function(e){ addExpense( $("#daily-expense") ); });
        $("#new-monthly-expense-dialog").live('click', function(e){ addExpense( $("#monthly-expense") ); });
        $("#new-income-dialog").live('click', function(e){ addIncome(); });

        $("div[id^='edit-']").live('click', function(e){
                var id = this.id.split('-')[2];
                var kind = this.id.split('-')[1];
                editEntry(id, kind);
            });

        $("div[id^='delete-']").live('click', function(e){
                var id = this.id.split('-')[1];
                deleteEntry( id );
            });


        $("#date-monthly-income").val([today.getFullYear(), today.getMonth() + 1, today.getDate()].join("-"));
        $('#date-monthly-income').datepicker('option',$.extend({showMonthAfterYear: false}, $.datepicker.regional.de)); // TODO: regional.de???
        $("#date-monthly-income").datepicker({dateFormat : "yy-mm-dd", onSelect : function(dateText, inst){ render_month(this.getAttribute("id"), dateText.split("-"));}});
        $("#date-daily-expense").val([today.getFullYear(), today.getMonth() + 1, today.getDate()].join("-"));
        $('#date-daily-expense').datepicker('option',$.extend({showMonthAfterYear: false}, $.datepicker.regional.de));
        $("#date-daily-expense").datepicker({dateFormat : "yy-mm-dd", onSelect : function(dateText, inst){render_day(this.getAttribute("id"),dateText.split("-"));}});
        $("#date-monthly-expense").val([today.getFullYear(), today.getMonth() + 1, today.getDate()].join("-"));
        $('#date-monthly-expense').datepicker('option',$.extend({showMonthAfterYear: false}, $.datepicker.regional.de));
        $("#date-monthly-expense").datepicker({dateFormat : "yy-mm", onSelect : function(dateText, inst){dateText += "-1"; render_month(this.getAttribute("id"), dateText.split("-"));}});


        function graph_monthly_expenses( date ){
            DB.view(design+"/available_categories?group=true",
                    { success : function(json) {
                            var categories = json.rows.map(function(r) { return r.key; });
                            DB.view(design+"/expenses_by_category?startkey=[" + date[0] + ",1];endkey=[" + date[0]+1 + ",1];group=true",
                                    { success : function(json) {
                                            var months = {};
                                            var year = [];
                                            json.rows.forEach( function( r ) { if (months[r.key[1]] === undefined) { months[r.key[1]] = {};}
                                                    if (months[r.key[1]][r.key[2]] === undefined) { months[r.key[1]][r.key[2]] = 0;}
                                                    months[r.key[1]][r.key[2]] = r.value;});

                                            for ( var i in months){
                                                if (months[i]){
                                                    var month_row = [];
                                                    for ( var j in categories ){
                                                        if ( months[i][categories[j]] === undefined ) {
                                                            month_row.push( 0 );
                                                        } else {
                                                            month_row.push ( months[i][categories[j]] );
                                                        }
                                                    }
                                                    year.push([ month_row, { label : Months[i-1]} ]);
                                                }
                                            }
                                            jQuery('#stacked-graph').tufteBar({
                                                    colors : ['#f63353','#fead76','#107279','#10fabc','#1181bf','#120902','#129105','#131848','#13a04b','#1427ee','#14a8b1','#1532d4','#15bcf7','#16671a','#16c13d','#175b60','#17d583','#186fa6','#18ecc9','#1973ec'],
                                                        data: year,
                                                        barLabel:  function(index) {
                                                        amount = ($(this[0]).sum()).toFixed(0);
                                                        return $.tufteBar.formatNumber(amount);
                                                    },
                                                        axisLabel: function(index) { return this[1].label; },
                                                        legend: {
                                                        data: categories
                                                            }

                                                });
                                        }});
                        }});
        }
        graph_monthly_expenses([today.getFullYear(), today.getMonth() + 1, today.getDate()])


    DB.openDoc("replicas",
               {success: function(json) {
                   json.hosts.map(
                       function(h){ var request = { "source" : h, "target" : dbname }
                                    $.ajax( { type: "POST", url: "/_replicate", data: JSON.stringify({ source : h, target : dbname, continuous: true }), contentType: "application/json"},null, function(c){} );
                                    $.ajax( { type: "POST", url: "/_replicate", data: JSON.stringify({ source : dbname, target : h, continuous : true, filter: design+"/copy_data" }), contentType: "application/json"},null, function(c){} );
                                  })}});

});