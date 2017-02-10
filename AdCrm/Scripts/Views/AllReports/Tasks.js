var koModel = {
    filter: {
        dateFrom: ko.obs(""),
        dateTo: ko.obs(""),
        archived: ko.obs(false),
        name: ko.obs("Новый фильтр"),
        taskTypes: ko.obs(),
        props: { number: ko.obs(), name: ko.obs(), createDate: ko.obs(), statusID: ko.obs(), responsibleName: ko.obs(), employeeName: ko.obs(), address: ko.obs(), dateSign: ko.obs(), dateEnd: ko.obs(), contractorName: ko.obs(), contractorContacts: ko.obs() }
    },
    data: ko.obs(null),
    rows: ko.obsa([]),
    lastTaskTr: null,
    lastProjectTr: null,
    gridProjects: $.fn.koGrid.getSaveSettingsObject("/AllReports/Tasks#tblProjects", "tblProjects"),
    gridTasks: $.fn.koGrid.getSaveSettingsObject("/AllReports/Tasks#tblTasks", "tblTasks"),
    inProgress: ko.obs(false),
    hideThePage: ko.obs(false),
    styleID: "tasksColumns"
};

(function ($) {
    $.fn.hasHScrollBar = function () {
        return this.get(0).scrollWidth > this.width();
    }
    $.fn.hasVScrollBar = function () {
        return this.get(0).scrollHeight > this.height();
    }
})(jQuery);

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");

    data = toJsObject(data);
    koModel.projectStatuses = data.projectStatuses;
    koModel.taskTypes = data.taskTypes;
    koModel.taskStatuses = [];
    data.taskStatuses.forEach(function (it) {
        koModel.taskStatuses[it.id] = it;
    });

    koModel.filter.dateFrom(data.dateFrom);
    koModel.filter.dateTo(data.dateTo);

    koModel.filter.clear = function () {
        koModel.filter.name("Новый фильтр");
        for (var i in koModel.filter.props) {
            koModel.filter.props[i](null);
        }
    };

    koModel.filter.taskTypes.subscribe(function (value) {
        if (!value) {
            $("#tblTasksHeaderMenu input").each(function () {
                $(this).checked(true);
                $(this).change();
            });
            return;
        }
        $("#tblTasksHeaderMenu input").each(function () {
            var v = this.value.substr(2) * 1;
            $(this).checked(value.contains(v));
            $(this).change();
        });
    });

    koModel.rows.filtered = ko.cmp(function () {
        var result = koModel.gridProjects.sorted ? koModel.gridProjects.sorted() : koModel.rows();
        result = result.where(function (it) {
            var pass = true;
            for (var i in koModel.filter.props) {
                var v = koModel.filter.props[i]();
                var p = it.project[i];
                if (v && typeof p != "undefined") {
                    pass = v == p || (p || "").toString().contains((v || "").toString(), 1);
                }
                if (!pass)
                    break;
            }
            return pass;
        });
        return result;
    });

    koModel.refresh = function () {
        top.busy("refresh");
        $.rjson({
            url: ApplicationRootPath + "AllReports/TasksJson",
            data: { DateFrom: koModel.filter.dateFrom(), DateTo: koModel.filter.dateTo(), Archived: koModel.filter.archived() },
            success: function (result) {
                top.free("refresh");
                result = toJsObject(result);

                koModel.data(result);
                result.rows.forEach(function (r) {
                    r.tasksDict = [];
                    r.tasks.forEach(function (it) {
                        if (r.tasksDict[it.typeID])
                            return;
                        r.tasksDict[it.typeID] = it;
                    });
                });
                koModel.rows(result.rows);
                //koModel.setSize();
            }
        });
    };
    koModel.setSize = function () {
        var style = [];
        var styleID = koModel.styleID;
        $("#" + styleID).remove();
        var pheader = $("#divProjectsHeader");
        var theader = $("#divTasksHeader");
        var h1 = pheader.find("tr").height();
        var h2 = theader.find("tr").height();
        if (h1 > h2) {
            style.push("#divTasksHeader tr { height: " + h1 + "px; } \r\n");
        } else if (h2 > h1) {
            style.push("#divProjectsHeader tr { height: " + h2 + "px; } \r\n");
        }

        var projects = $("#tblProjects tbody tr");
        var tasks = $("#tblTasks tbody tr");
        projects.each(function (i, tr) {
            tr = $(tr);
            var task = $(tasks[i]);

            var h1 = tr.height();
            var h2 = task.height();
            if (h1 > h2) {
                style.push("#tblTasks tbody tr.tr" + i + " { height: " + h1 + "px; } \r\n");
            } else if (h2 > h1) {
                style.push("#tblProjects tbody tr.tr" + i + " { height: " + h2 + "px; } \r\n");
            }

            tr.unbind("hover.report");
            tr.bind("hover.report", koModel.syncHover);

            task.unbind("hover.report");
            task.bind("hover.report", koModel.syncHover);
        });

        if ($("#" + styleID).size() < 1) {
            var style = style.join("");
            style = "<style id='" + styleID + "' type='text/css'>" + style + "</style>";
            $("head").append(style);
        }

    };

    koModel.syncHover = function (e) {
        var tr = $(e.currentTarget);
        if (koModel.lastProjectTr != null) {
            $(koModel.lastProjectTr).removeClass("hover");
        }
        if (koModel.lastTaskTr != null) {
            $(koModel.lastTaskTr).removeClass("hover");
        }
        var i = tr.attr("rowindex");
        koModel.lastTaskTr = $("#divTasks tr.tr" + i);
        koModel.lastTaskTr.addClass("hover");
        koModel.lastProjectTr = $("#divProjects tr.tr" + i);
        koModel.lastProjectTr.addClass("hover");
    };

    var date = new Date();
    var year = date.getFullYear();

    koModel.year = ko.obs("");
    koModel.month = ko.obs("");
    koModel.years = ko.obsa([]);
    koModel.months = ko.obsa($.datepicker.regional['ru'].monthNames.select(function (it, i) {
        var result = {
            id: i + 1,
            name: it
        };

        return result;
    }));
    for (var i = year - 6; i < year + 5; i++) {
        koModel.years.push({
            id: i.toString(),
            name: i.toString()
        });
    }

    koModel.confirmMonth = function () {
        var dateFrom = new Date();
        var dateTo = new Date();

        dateFrom.setYear(koModel.year());
        dateFrom.setMonth(koModel.month() - 1);
        dateFrom.setDate(1);
        dateTo.setYear(koModel.year());
        dateTo.setMonth(koModel.month());
        dateTo.setDate(1);
        dateTo.setDate(0);

        koModel.filter.dateFrom(dateFrom.toSds());
        koModel.filter.dateTo(dateTo.toSds());

        $("#divMonths").dialog("close");
        koModel.refresh();
    };

    koModel.selectMonth = function () {
        $("#divMonths").dialog("open");
    };

    koModel.cancelMonth = function () {
        $("#divMonths").dialog("close");
    };

    koModel.getTaskTypes = function () {
        var cols = $("#divTasksHeader td:visible");
        var ids = [];
        cols.each(function (i, it) {
            var col = it.attributes.getNamedItem("colname").value;
            if (col != "Save") {
                ids.push(col.substr(2) * 1);
            }
        });
        return ids;
    };

    koModel.toExcel = function () {
        var rows = koModel.rows();
        var projectCols = [];
        $("#divProjectsHeader td:visible div.col").each(function (i, it) {
            var name = $(it).attr("sortpath");
            if (!name || name == "Save")
                return;
            var text = $(it).find(".th span").text();
            projectCols.push({ name: name, text: text, fn: eval("(function() { return this." + name + "; })") });
        });
        var taskTypes = koModel.getTaskTypes().select(function (it) { return koModel.taskTypes.first("val=>val.id==" + it); });

        var headers = projectCols.select("val=>val.text");
        headers = headers.concat(taskTypes.select("val=>val.shortName||val.name"));
        
        var name = ["Отчет_по_задачам"].join("");
        var rows = rows.select(function (it) {
            var values = projectCols.select(function (c) { return c.fn.apply(it); });
            values = values.concat(taskTypes.select(function (s) {
                var task = it.tasksDict[s.id];
                return task ? (task.statusText || koModel.taskStatuses[task.statusID].name) : "";
            }));
            return values;
        });
        $.rjson({
            url: host.arp + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
                if (result.Success) {
                    window.location = result.Url;
                }
            }
        });
    };

    var proejctSettings = data.settings.first("val=>val.name=='" + koModel.gridProjects.name + "'");
    if (proejctSettings) {
        proejctSettings = eval("(" + proejctSettings.value + ")");
    }

    var gridProjects = $("#tblProjects").koGrid({
        koTemplateID: "trProject",
        headerContainer: $("#divProjectsHeader"),
        styleID: "stlProjectsGrid",
        tableID: "tblProjects",
        columns: proejctSettings || [],
        sortable: true,
        autoSort: true,
        source: koModel.rows,
        disallowSort: ["Save", "Select"]
    });
    koModel.gridProjects.sorted = gridProjects.sorted;

    var taskSettings = data.settings.first("val=>val.name=='" + koModel.gridTasks.name + "'");
    if (taskSettings) {
        taskSettings = eval("(" + taskSettings.value + ")");
    }

    var gridTasks = $("#tblTasks").koGrid({
        koTemplateID: "trTask",
        headerContainer: $("#divTasksHeader"),
        styleID: "stlTasksGrid",
        tableID: "tblTasks",
        columns: taskSettings || [],
        sortable: false,
        autoSort: false,
        source: koModel.rows,
        disallowSort: ["Save", "Select"]
    });
    koModel.gridTasks.sorted = gridTasks.sorted;
    koModel.gridTasks.grid = gridTasks;

    $("#divMonths").dialog({
        autoOpen: false,
        modal: true,
        resizable: false,
        width: 500,
        height: 520,
        open: function () {
            var date = parseDate(koModel.filter.dateFrom());

            koModel.year(date.getFullYear());
            koModel.month(date.getMonth() + 1);
        }
    });

    koModel.toggleFilter = function (a, e) {
        var f = $(e.currentTarget).parents('td').find('div.filter');
        f.toggle();
        f.find("input").focus();
        return false;
    };
    koModel.filterClick = function () {
        return false;
    };

    initFilters(koModel, null, data);

    koModel.filter.getData = function () {
        koModel.filter.taskTypes(koModel.getTaskTypes());
        return ko.toJSON(koModel.filter);
    };

    ko.apply(koModel);

    koModel.refresh();

    $("#divTasks").bind("scroll", function () {
        $("#divProjects").scrollTop($(this).scrollTop());
    });
    $("#divProjects").bind("scroll", function () {
        $("#divTasks").scrollTop($(this).scrollTop());
    });

    setInterval(koModel.setSize, 500);
});