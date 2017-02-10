var koModel = {
    filter: {
        dateFrom: ko.obs(""),
        dateTo: ko.obs(""),
        archived: ko.obs(false),
        stages: ko.obsa([]),
        notStages: ko.obsa([])
    },
    data: ko.obs(null),
    inProgress: ko.obs(false),
    hideThePage: ko.obs(false),
    styleID: "stagesColumns"
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
    koModel.stages = data.workStages;//.orderBy("val=>val.shortName||val.name");

    koModel.filter.dateFrom(data.dateFrom);
    koModel.filter.dateTo(data.dateTo);

    koModel.refresh = function () {
        top.busy("refresh");
        $.rjson({
            url: ApplicationRootPath + "AllReports/StagesJson",
            data: { DateFrom: koModel.filter.dateFrom(), DateTo: koModel.filter.dateTo(), Archived: koModel.filter.archived() },
            success: function (result) {
                top.free("refresh");
                result = toJsObject(result);

                koModel.data(result);
                koModel.setSize();
            }
        });
    };
    koModel.setSize = function () {
        var styleID = koModel.styleID;
        $("#" + styleID).remove();

        var w = $("#divStagesProjects").outerWidth();
        $("#divStages").css("margin-left", (w + 0) + "px");

        if (koModel.filtered) {
            for (var i = -2; i < koModel.filtered().length; i++) {
                var css = "tr" + i;
                var tr1 = $("#divStagesProjects tr." + css);
                var tr2 = $("#divStages tr." + css);
                var h = Math.max(tr1.height(), tr2.height());
                tr1.height(h);
                tr2.height(h);
            }
        }

        var style = [];
        var colGroups = $("#divStagesContainer [colname]").toArray().group("val=>val.attributes.colname.value");

        for (var i = 0; i < colGroups.length; i++) {
            var cols = colGroups[i];
            var name = cols[0].attributes.colname.value;
            var width = cols.max("val=>$(val).find('a:first,span:first').width()");
            style.push("#divStagesContainer [colname=" + name + "] { width: " + (width + 2) + "px; min-width: " + (width + 2) + "px; } \r\n");
            //style.push("#divStagesContainer th[colname=" + name + "] { width: " + (width + 1) + "px; min-width: " + (width + 1) + "px; } \r\n");
        }

        if ($("#" + styleID).size() < 1) {
            var style = style.join("");
            style = "<style id='" + styleID + "' type='text/css'>" + style + "</style>";
            $("head").append(style);
        }

        var mh = $(window).height() - $("#divStagesContainer").offset().top - 30;
        mh = Math.max(mh, $("#divAccordion").outerHeight() - 30);// + 10);
        $("#divStagesContainer,#divStages").height(mh);

        $("#tblStages").width($("#tblStagesHeader").width());
        $("#divStagesTable").width($("#divStages").width());
        $("#divStagesHeader").width($("#divStagesTable").width() - ($("#divStagesTable").hasVScrollBar() ? 17 : 0));

        var h = $("#divStages").height() - $("#divStagesHeader").height();
        $("#divStagesTable").height(h);

        $("#divStagesProjects").height(mh - ($("#divStagesTable").hasHScrollBar() ? 17 : 0));
        $("#divStagesProjectsTable").height(h - ($("#divStagesTable").hasHScrollBar() ? 17 : 0));

        $("#divStagesHeader").width($("#divStagesTable").width() - ($("#divStagesTable").hasVScrollBar() ? 17 : 0));
        $("#divStagesTable").trigger("scroll");

        $("#divStagesTable").width($("#divStages").width());
        $("#divStagesHeader").width($("#divStagesTable").width() - ($("#divStagesTable").hasVScrollBar() ? 17 : 0));
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

    koModel.toggleStage = function (row) {
        if (koModel.filter.stages().any("val=>val==" + row.id)) {
            koModel.filter.stages.remove(row.id);
            koModel.filter.notStages.push(row.id);
        } else if (koModel.filter.notStages().any("val=>val==" + row.id)) {
            koModel.filter.notStages.remove(row.id);
        } else {
            koModel.filter.stages.push(row.id);
        }
    };

    koModel.filtered = ko.cmp(function () {
        var rows = koModel.data() ? koModel.data().rows : [];
        var stages = koModel.filter.stages();
        var notStages = koModel.filter.notStages();
        rows = rows.where(function (it) {
            //debugger;
            var a = !stages.any() || !stages.any(function (s) {
                return !it.stages.any("val=>val==" + s);
            });
            var b = !notStages.any() || !notStages.any(function (s) {
                return it.stages.any("val=>val==" + s);
            });
            return a && b;
        });
        //koModel.setSize();
        return rows;
    });

    koModel.toExcel = function () {
        var rows = koModel.filtered();
        var headers = ["Проект"];
        headers = headers.concat(koModel.stages.select("val=>val.shortName||val.name"));

        var name = ["Отчет_по_стадиям"].join("");//, koModel.filter.dateFrom(), koModel.filter.dateTo()].join("").replace(/\./g, "");
        var rows = rows.select(function (it) {
            var values = [it.name];
            values = values.concat(koModel.stages.select(function (s) { return it.stages.any('val=>val==' + s.id) ? 'X' : ''; }));
            return values;
        });
        $.rjson({
            url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
                if (result.Success) {
                    window.location = result.Url;
                }
            }
        });
    };

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

    ko.apply(koModel);

    koModel.refresh();

    $("#divStagesTable").bind("scroll", function () {
        $("#divStagesHeader").scrollLeft($("#divStagesTable").scrollLeft());
        $("#divStagesProjectsTable").scrollTop($("#divStagesTable").scrollTop());
    });
});