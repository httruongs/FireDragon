// Make dispacher action types into constants.
// Flux diagram.
// Make sure to register everything before dispatching.
// Define action type payloads in documentation.
// May wish to move these into App.

var fs = nw.require('fs');

var Datastore = require('nedb');
var WorkflowDispatcher = new Flux.Dispatcher();

var StateStore = {
    xml: null,
    workflow: null,
    dbPath: null,
    dbInstance: null,
    elements: null
};

var TaskStore = {
    tasks: [],
    current: {
        label: null,
        name: null,
        id: null
    }
};

var FormStore = {
    waiting: [],
    completed: [],
    saved: [],
    
    current: null
};

var views = {
    startIntro: $("#view-start-intro"),
    startTasks: $("#view-start-tasks"),
    task:       $("#view-task"),
    collect:    $("#view-collect"),
    navTop:     $("#view-top"),
    navBottom:  $("#view-bottom")
};

var comps = {
    topWorkflowName: $("#comp-top-workflow-name"),
    startIntroFirsttime: $("#comp-start-intro-firsttime"),
    startIntroNotFirsttime: $("#comp-start-intro-not-firsttime"),
    startIntroLastWorkflowName: $("#comp-start-intro-last-workflow-name"),
    startIntroContinue: $("#comp-start-intro-continue"),
    startIntroOpen: $("#comp-start-intro-open"),
    startIntroFile: $("#comp-start-intro-file"),
    startTasksWorkflowName: $("#comp-start-tasks-workflow-name"),
    startTasksLastTask: $("#comp-start-tasks-last-task"),
    startTasksLastTaskName: $("#comp-start-tasks-last-task-name"),
    startTasksTaskList: $("#comp-start-tasks-task-list"),
    startTasksTaskCollectButton: $("#comp-start-tasks-task-collect-button"),
    bottomPages: $("#comp-bottom-pages"),
    collectIntroFirstTime: $("#comp-collect-intro-firsttime"),
    collectIntroNotFirstTime: $("#comp-collect-intro-not-firsttime"),
    collectIntroLastCollectionDate: $("#comp-collect-intro-last-collection-date"),
    collectSinceLast: $("#comp-collect-since-last"),
    collectRangeStartDate: $("#comp-collect-range-start-date"),
    collectRangeEndDate: $("#comp-collect-range-end-date"),
    collectRangeButton: $("#comp-collect-range-button"),
    collectIntroFirstTime: $("#comp-collect-intro-firsttime"),
    collectAllButton: $("#comp-collect-all-button"),
    bottomSave: $("#comp-bottom-save"),
    bottomSubmit: $("#comp-bottom-submit"),
    bottomWaiting: $("#comp-bottom-waiting"),
    bottomInProgress: $("#comp-bottom-inprogress"),
    bottomCompleted: $("#comp-bottom-completed"),
};
 
/**
   Get list of elements used in form and return them.
**/
var getElementList = function(xml){
    var elements = [
	"textbox",
	"textarea",
	"yesno",
	"date",
	"datetime",
	"checkbox"
    ];

    var result = [];

    $(elements).each(function(index, element){
	var items = xml.find(element);

	items.each(function(index, item){
	    result.push({
		label: $(item).attr("label"),
		name: $(item).attr("name"),
		type: element
	    });
	});
    });

    return result;
}   

var loadForm = function(id) {
    // Form being displayed right now.
    if (FormStore.current != null) {
	// Do we care?
	if (!confirm("There is unsaved data.\n\nWould you like to open the new form anyway?")) {
	    return;
	}
    }
    else {
	$("#view-task").css("display", "block");
	$("#comp-bottom-save").css("display", "block");
	$("#comp-bottom-submit").css("display", "block");
    }

    StateStore.dbInstance.findOne({
   	"_id": id
    },
    function(err, doc) {
	if (err) {
	    alert(`An error was encountered trying to find the form.\n\nThe form ID was "${id}".\n\n${err}`);
	    
	    return;
	}
	
	WorkflowDispatcher.dispatch({
	    actionType: "new-form",
	    form: doc
	});
    });
}

var createMenuItem = function(label, id) {
    var menuitem = $(`<a href="#" class="dropdown-item" data-id="${id}">${label}</a>`)
        .click(function(e) {
            loadForm(e.target.dataset.id);
        });

    return menuitem;
}

var App = (function ($) {
    // After research these performance-oriented shortcuts aren't that useful.
    // jQuery claims that its select, especially for IDs is very fast
    // thansk to brower enhancements.

    /* If a previous workflow is not in localStorage then 
       it's probably not their first time using the app. */
    if (localStorage.getItem("file:last-workflow-name")) {
        comps.startIntroLastWorkflowName.text(localStorage.getItem("file:last-workflow-name"));
        comps.startIntroLastWorkflowName.css("display", "inline");
        comps.startIntroFirsttime.css("display", "none");
        comps.startIntroContinue.css("display", "inline-block");
    }
    else {
        comps.startIntroNotFirsttime.css("display", "none");
        comps.startIntroFirsttime.css("display", "block");
        comps.startIntroContinue.css("display", "none");
    }

    var gui = require('nw.gui');

    gui.Window.get().on('close', function() {
        if (confirm("Unsaved work will not be saved for you. Are you sure?")) {
            // Supposedly unnecessary to close the database.
            // Yet,
            // You can manually call the compaction function with
            // yourDatabase.persistence.compactDatafile().
            // The datastore will fire a compaction.done event once compaction is finished.

            this.close(true); // Don't forget.
        }
    });

    // Would be useful with a callback, then moved to another file.
    var readWorkflow = function(file) {
        // UTF-8 includes Latin 1, so we should be okay here for our audience.
        // I'm sure we could always detect the character set if it became necessary.
        fs.readFile(file, 'utf8', function(err, txt) {
            if (err) {
                if(confirm("There was a problem opening the file:\n\n" +
                           file + "\n\nWould you like to try a different file?"))
                {
                    // Sufficient. More abstract event not necessary at this moment.
                    comps.startIntroFile.trigger("click");
                }
                
                return;
            }

            // Would be better as a callback.
            WorkflowDispatcher.dispatch({
                actionType: "process-file",
                file: file,
                // This will send a jQuery-ized XML document.
                xml: $($.parseXML(txt))
            });
        });
    }

    WorkflowDispatcher.register(function(payload) {
        if (payload.actionType === 'process-file') {
            StateStore.xml = payload.xml;

            // If the document is valid, this should not cause errors.
            StateStore.workflow = StateStore.xml.find("workflow").attr("label");

            // Same.
            StateStore.dbPath = StateStore.xml.find("properties").find("property[name=database-path]").text();

            // If an old database is open it should be closed. 
            StateStore.dbInstance = new Datastore({ filename: StateStore.dbPath, autoload: true });

	    StateStore.elements = getElementList(StateStore.xml);

            // Unneeded dispatching.
            if (payload.file != localStorage.getItem("file:last-path", payload.file)){
                localStorage.setItem("file:last-path", payload.file);
            }

            // Tell user about their last session if we have the information.
            // If the workflow they're using now is different than last time
            if (StateStore.workflow != localStorage.getItem("file:last-workflow-name", StateStore.workflow)) {
                if (localStorage.getItem("file:last-workflow-name", StateStore.workflow) != null) {
                    alert("Next time you use Dragon, " +
                          localStorage.getItem("file:last-workflow-name", StateStore.workflow) +
                          " will be called " + StateStore.workflow + ".");
                }

                
                localStorage.setItem("file:last-workflow-name", StateStore.workflow);
            }

            // Set workflow name in the jumbotron for the next page.
            comps.startTasksWorkflowName.text(StateStore.workflow);

            // Set the workflow name in the top bar.
            comps.topWorkflowName.text(StateStore.workflow);

            views.startIntro.css("display", "none");
            views.startTasks.css("display", "block");

            var tasks = StateStore.xml.find("task");

            tasks.each(function(index, task) {
                TaskStore.tasks.push({
                    label: $(task).attr("label"),
                    name: $(task).attr("name"),
                    id: index
                });

                // Rather obnoxious element building.
                // Create buttons for selecting the task to do.
                var button = $(`<button type="button" class="btn btn-lg">${$(task).attr("label")}</button>`)
                    .click(function(e) {
                        WorkflowDispatcher.dispatch({
                            actionType: "select-task",
                            label: $(task).attr("label"),
                            name: $(task).attr("name"),
                            id: index,
                            collect: false
                        });                     
                    });

                // Make the button of the last-used task standout.
                if ($(task).attr("name") == localStorage.getItem("workflow:last-task-name")) {
                    button.addClass("btn-primary");
                }
                else {
                    button.addClass("btn-secondary");
                }
                
                comps.startTasksTaskList.append(button);
            });
        }
    });

    WorkflowDispatcher.register(function(payload) {
        if (payload.actionType === 'select-task') {
            if (payload.collect) {
                views.collect.css("display", "block");
            }
            else {
                // Store selected task.
                TaskStore.current = {
                    label: payload.label,
                    name: payload.name,
                    id: payload.id
                };

		$("#comp-top-newform").css("display", "inline-block");

                // Get waiting forms.
                // These are started, but incomplete forms, and those completed in a previous task.
                // If this is the first task then we will skip this since there are no
                // previous tasks to create waiting stuff. We should hide the control then.
                if (TaskStore.current.id == 0) {
                    comps.bottomWaiting.css("display", "none");
                }
                else {
                    StateStore.dbInstance.find({
                        // Scary string conversion to integer.
                        "task": TaskStore.current.id - 1,
                        // Get incomplete forms.
                        "completed": true
                    },
                    function(err, results) {
                        var waiting = [];
                
                        results.forEach(function(item) {
                            waiting.push({
                                "label": item["patient-name"],
                                "id": item._id
                            });
                        });
                        
                        WorkflowDispatcher.dispatch({
                            actionType: "update-waiting-forms",
                            waiting: waiting
                        });
                    });
                }

                // Get saved forms.
                // These are started, but incomplete forms, and those completed in a previous task.
                StateStore.dbInstance.find({
                    // This task.
                    "task": TaskStore.current.id,
                    // Get incomplete forms.
                    "completed": false
                },
                function(err, results) {  
                    var saved = [];
                
                    results.forEach(function(item) {
                        saved.push({
                            "label": item["patient-name"],
                            "id": item._id
                        });
                    });

                    WorkflowDispatcher.dispatch({
                        actionType: "update-saved-forms",
                        saved: saved
                    });
                });

                // Get complete workflows.
                // Update to get only those completed today.
                StateStore.dbInstance.find({
                    // This task.
                    "task": TaskStore.current.id,
                    // Get incomplete forms.
                    "completed": true
                },
                function(err, results) {  
                    var completed = [];
                    
                    results.forEach(function(item) {
                        completed.push({
                            "label": item["patient-name"],
                            "id": item._id
                        });
                    });
                    
                    WorkflowDispatcher.dispatch({
                        actionType: "update-completed-forms",
                        completed: completed
                    });
                });

                // Set last task info.
                localStorage.setItem("workflow:last-task-label", payload.label);
                localStorage.setItem("workflow:last-task-name", payload.name);

		var form = StateStore.xml.find("form");

		// Important. Build the form.
		build(views.task, form, {});

		// Build page list in bottom nav.
		// Move somewhere else.
		form.find("page").each(function(index, page) {
		    comps.bottomPages.append($(
			`<li class="nav-item">
                     <a class="nav-link" href="#${$(page).attr("name")}">${$(page).attr("label")}</a>
                 </li>`));
		});

                views.navBottom.css("display", "block");
            }

            views.startTasks.css("display", "none");
        }
    });
    
    // Save form for later without sending to next task.
    comps.bottomSave.click(function(e) {
        var form = document.getElementsByTagName("form");

        var newDoc = {};

        // If the form is empty, don't save anything.
        
        $($(form).serializeArray()).each(function (index, item) {
            newDoc[item.name] = item.value;
        });

        newDoc["task"] = TaskStore.current.id;
        // Need to append step if we are being submitted.
        newDoc["completed"] = false;

        if (FormStore.current) {
            // Update form
            StateStore.dbInstance.update({_id: FormStore.current._id}, newDoc, {}, function (err, doc) {
                // If successfully inserted, update store.
                if (err) {
                    alert("Unable to save the form:\n\n" + err);
                    
                    return;
                }

		FormStore.current = null;

		$("#view-task").css("display", "none");

		$("#comp-bottom-save").css("display", "none");
		$("#comp-bottom-submit").css("display", "none");
            });
        }
        else {
            StateStore.dbInstance.insert(newDoc, function (err, doc) {
                // If successfully inserted, update store.
                if (err) {
                    alert("Unable to save the form:\n\n" + err);
                    
                    return;
                }

		FormStore.current = null;

		$("#view-task").css("display", "none");

		$("#comp-bottom-save").css("display", "none");
		$("#comp-bottom-submit").css("display", "none");

                WorkflowDispatcher.dispatch({
                    actionType: 'new-saved-form', 
                    label: newDoc["patient-name"],
                    id: doc._id
                });
            });
        }
    });

    $("#comp-top-newform").css("display", "none");

    $("#comp-top-newform").click(function(e) {
	FormStore.current = null;

	$("#view-task").css("display", "block");
	$("#comp-bottom-save").css("display", "block");
	$("#comp-bottom-submit").css("display", "block");

	WorkflowDispatcher.dispatch({
	    actionType: "new-form",
	    form: null
	});
    });

    // Save form for later without sending to next task.
    comps.bottomSubmit.click(function(e) {
        var form = document.getElementsByTagName("form");

        var newDoc = {};

        // If the form is empty, don't save anything.
        
        $($(form).serializeArray()).each(function (index, item) {
            newDoc[item.name] = item.value;
        });

        newDoc["task"] = TaskStore.current.id;

        newDoc["completed"] = true;

        if (FormStore.current._id) {
            // Update form
            StateStore.dbInstance.update({_id: FormStore.current._id}, newDoc, {}, function (err, doc) {
                if (err) {
                    alert("Unable to submit the form:\n\n" + err);
                    
                    return;
                }
                
		FormStore.current = null;

		$("#view-task").css("display", "none");

		$("#comp-bottom-save").css("display", "none");
		$("#comp-bottom-submit").css("display", "none");

                WorkflowDispatcher.dispatch({
                    actionType: 'new-completed-form', 
                    label: newDoc["patient-name"],
                    id: doc._id
                });
            });
        }
        else {
            StateStore.dbInstance.insert(newDoc, function (err, doc) {
                if (err) {
                    alert("Unable to save the form:\n\n" + err);

                    return;
                }

		FormStore.current = null;

		$("#view-task").css("display", "none");

		$("#comp-bottom-save").css("display", "none");
		$("#comp-bottom-submit").css("display", "none");

                WorkflowDispatcher.dispatch({
                    actionType: 'new-completed-form', 
                    label: newDoc["patient-name"],
                    id: doc._id
                });
            });
        }
    });

    // Could stick into state to start. Could think of it as outside that flow.
    if (localStorage.getItem("workflow:last-task-name") &&
        localStorage.getItem("workflow:last-task-label"))
    {
        comps.startTasksLastTaskName.text(localStorage.getItem("workflow:last-task-label"));
        comps.startTasksLastTaskName.show();
    }
    else {
        comps.startTasksLastTaskName.hide();
    }

    comps.startTasksTaskCollectButton.click(function(e){
        WorkflowDispatcher.dispatch({
            actionType: "select-task",
            label: "",
            name: "",
            collect: true
        });
    });

    $("#comp-collect-button").click(function(e) {
	$("#comp-collect-save").trigger("click");
    });
    
    $("#comp-collect-save").change(function(e){
	var result = "";

	// Add header.
	$(StateStore.elements).each(function(index, element) {
	    result += `"${element.label}",`;
	});

	result += "\n";

	StateStore.dbInstance.find({}, function(err, docs) {
	    if (err) {
		alert(err);

		return;
	    }

	    $(docs).each(function(index, doc) {
		$(StateStore.elements).each(function(index, element) {
		    result += (doc[element.name]) ? `"${doc[element.name]}"` : `""`;
		    result += ",";
		});

		result += "\n";
	    });
	    
            var file = e.target.files[0].path;

	    fs.writeFile(file, result, function(err) {
		if (err) {
		    console.info("There was an error attempting to save your data.");
		    console.warn(err.message);

		    return;
		} 

		alert("File saved.");
	    });
	});
    });
    
    comps.startIntroFile.change(function(e){
        var file = $(this).prop("files")[0].path;

        readWorkflow(file);
    });

    comps.startIntroOpen.click(function(e){
        comps.startIntroFile.trigger("click");
    });

    comps.startIntroContinue.click(function(e){
        readWorkflow(localStorage.getItem("file:last-path"));
    });

    // We could get update every time, but why.
    WorkflowDispatcher.register(function(payload) {
        if (payload.actionType === 'new-completed-form') {
            FormStore.completed.push({
                label: payload.label,
                id: payload.id
            });

            // Clear current form and ID;
            // We can rebuild the form or we can clear all the items.
            // FormStore.current.id = null;

            $("#comp-bottom-completed-menu")
                .append(createMenuItem(payload.label, payload.id));

            // Update badge.
            $($("#comp-bottom-completed").find(".badge")[0]).text(FormStore.completed.length);
        }
        else if (payload.actionType === 'new-waiting-form') {
            FormStore.waiting.push(payload.waiting);
        }
        else if (payload.actionType === 'new-saved-form') {
            FormStore.saved.push({
                label: payload.label,
                id: payload.id
            });

            $("#comp-bottom-saved-menu")
                .append(createMenuItem(payload.label, payload.id));

            // Update badge.
            $($("#comp-bottom-saved").find(".badge")[0]).text(FormStore.saved.length);
        }
    });

    WorkflowDispatcher.register(function(payload) {
        if (payload.actionType === 'update-completed-forms') {
            FormStore.completed = payload.completed;

            $(FormStore.completed).each(function(index, item) {
                $("#comp-bottom-completed-menu")
                    .append(createMenuItem(item.label, item.id));
            });

            // Update badge.
            $($("#comp-bottom-completed").find(".badge")[0]).text(FormStore.completed.length);
        }
        else if (payload.actionType === 'update-waiting-forms') {
            FormStore.waiting = payload.waiting;

            $(FormStore.waiting).each(function(index, item) {
                $("#comp-bottom-waiting-menu")
                    .append(createMenuItem(item.label, item.id));
            });

            // Update badge.
            $($("#comp-bottom-waiting").find(".badge")[0]).text(FormStore.waiting.length);
        }
        else if (payload.actionType === 'update-saved-forms') {
            FormStore.saved = payload.saved;

            $(FormStore.saved).each(function(index, item) {
                $("#comp-bottom-saved-menu")
                    .append(createMenuItem(item.label, item.id));
            });

            // Update badge.
            $($("#comp-bottom-saved").find(".badge")[0]).text(FormStore.saved.length);
        }
    });

    // Add handler to refresh each of the lists when they are clicked.
    // Add handler to poll for new items with frequency.
}($));

// Repopulating a form.
// We will have a list of form element names that correspond to database document properties.
// We could provide an object to build.

WorkflowDispatcher.register(function(payload){
    if (payload.actionType === 'new-form') {
	FormStore.current = payload.form;
	
	// Have element list in StateStore
	$(StateStore.elements).each(function(item, element) {
	    switch (element.type) {
	    case "textbox":
	    case "date":
	    case "datetime":
	    case "textarea":
		$(`#${element.name}`).attr("value", FormStore.current[element.name] || "");
		
		break;
	    case "checkbox":
		if (FormStore.current[element.name] == "on") {
		    $(`#${element.name}`).attr("checked", "checked");
		}
		else {
		    $(`#${element.name}`).removeAttr("checked");
		}

		break;
	    case "yesno":
		if (FormStore.current[element.name] == "yes") {
		    $(`#${element.name}-yes`).attr("checked");

		    $(`#${element.name}-yes`).parent().addClass("active");
		    $(`#${element.name}-no`).parent().removeClass("active");
		}
		else if (FormStore.current[element.name] == "no") {
		    $(`#${element.name}-no`).attr("checked");

		    $(`#${element.name}-no`).parent().addClass("active");
		    $(`#${element.name}-yes`).parent().removeClass("active");
		}
		else {
		    console.log(`Invalid value "${element.name}" for ${element.type} element.`);
		}
		
		break;
	    default:
		break;
	    }
	});
    }
});
