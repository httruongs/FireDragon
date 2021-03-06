$(document).ready(function() {
    $.get('xml/page.xml', function(xml) {
	var build = function(parent, node) {
	    var nodeName = node.prop("nodeName");

	    switch(nodeName) {
	    case "form":
		var form = $(document.createElement("div"))
		    .addClass("container"); // Bootstrap

		var header = $(document.createElement("span"));

		header.text(node.attr("label"));

		form.append(
		    $(document.createElement("div"))
			.addClass("row")
			.append(
			    $(document.createElement("div"))
				.addClass("col")
				.append(header)));

		parent.append(form);
		
		node.find("page").each(function(id){
		    build(form, $(this));
		});

		break;
	    case "page":
		var page = $(document.createElement("div"))
		    .addClass("row"); // Bootstrap

		parent.append(page);
		
		node.find("section").each(function(id){
		    build(page, $(this));
		});

		break;
	    case "section":
		var section = $(document.createElement("div"))
		    .addClass("row")
		    .append(
			$(document.createElement("div"))
			    .addClass("col")
		    );

		parent.append(section);
		
		node.find("row").each(function(id){
		    build(section, $(this));
		});

		break;
	    case "row":
		var row = $(document.createElement("div"))
		    .addClass("row"); // Bootstrap 

		parent.append(row);
		
		node.find("column").each(function(id){
		    build(row, $(this));
		});

		break;
	    case "column":
		var column = $(document.createElement("div"))
		    .addClass("col"); // Bootstrap 

		parent.append(column);
		
		node.children().each(function(id){
		    build(column, $(this));
		});

		break;
	    case "header":
		var header = $(document.createElement("h1"));

		header.text(node.text());

		parent.append(header);
		
		break;
	    case "textbox":
		var label = $(document.createElement("label")).text(node.attr("label"));
		var input = $(document.createElement("input"))
		    .attr("type", "text");

		label.append(input);
		parent.append(label, $("<br />"));
		
		break;
	    case "date":
		var label = $(document.createElement("label")).text(node.attr("label"));
		var input = $(document.createElement("input"))
		    .attr("type", "date");

		label.append(input);
		parent.append(label, $("<br />"));
		
		break;
	    case "datetime":
		var label = $(document.createElement("label")).text(node.attr("label"));
		var input = $(document.createElement("input"))
		    .attr("type", "datetime");

		label.append(input);
		parent.append(label, $("<br />"));
		
		break;
	    case "checkbox":
		var label = $(document.createElement("label")).text(node.attr("label"));
		var input = $(document.createElement("input"))
		    .attr("type", "checkbox");

		label.prepend(input);
		parent.append(label, $("<br />"));
		
		break;
	    case "yesno":
		var label = $(document.createElement("label")).text(node.attr("label"));
		
		var yesl = $(document.createElement("label")).text("Yes");
		var yes = $(document.createElement("input"))
		    .attr("type", "radio")
		    .attr("name", node.attr("name"));

		var nol = $(document.createElement("label")).text("No");
		var no = $(document.createElement("input"))
		    .attr("type", "radio")
		    .attr("name", node.attr("name"));

		yesl.prepend(yes);
		nol.prepend(no);
		
		parent.append(label, yesl, nol, $("<br />"));
		
		break;
	    default:
		break;
	    }
	};

	var xmlDoc = $.parseXML(xml);

	var $xml = $(xmlDoc);
	var form = $xml.find("form");

	build($("body"), form);
    }, "text");
});
