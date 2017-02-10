$.fn.koGrid = function (options, value) {
    var me = $(this);
    me.settings = me.get(0).settings;

    if (!me.data("koGrid")) {
        var settings = {
            styleID: "stlKoGrid",
            tableID: "tblKoGrid" + (new Date).getMilliseconds(),
            headerTableID: "",
            koTemplateID: "",
            headerContainer: me.parents(":first"),
            padding: 10,
            border: 1,
            columns: [],
            source: ko.obsa([]),
            sortable: false,
            disallowSort: [],
            sortMethod: null,
            autoSort: false
        };

        $.extend(settings, options);
        settings.headerTableID = settings.tableID + "Header";
        me.settings = me.get(0).settings = settings;

        var headerTable = ["<div class='grid-header'><table class='header' id='", settings.headerTableID, "'><tr>"];
        var columnsMenu = ["<ul class='kogrid-menu'><li class='button'><a href='javascript:' class='icon small delete'></a></li>"];
        var orderBy = {
            name: ko.obs(""),
            path: ko.obs(""),
            desc: ko.obs(false),
            inProgress: ko.obs(false)
        };

        var order = function () {
            if (!settings.sortable || orderBy.inProgress()) {
                return;
            }

            var colname = toJsName(orderBy.name());
            var path = orderBy.path();

            if (isEmpty(colname)) {
                return;
            }

            orderBy.inProgress(true);

            var div = headerTable.find("div.col[colname=" + orderBy.name() + "]");

            headerTable.find("div.col[colname]").removeClass("desc");
            headerTable.find("div.col[colname]").removeClass("asc");

            if (!orderBy.desc()) {
                div.addClass("asc");
            } else {
                div.addClass("desc");
            }

            if (settings.sortMethod) {
                settings.sortMethod(path, orderBy.desc());
                orderBy.inProgress(false);
                return;
            }

            orderBy.inProgress(false);
        };

        orderBy.order = order;
        settings.orderBy = orderBy;

        orderBy.clear = function () {
            if (!settings.sortable || orderBy.inProgress()) {
                return;
            }

            var colname = toJsName(orderBy.name());
            if (isEmpty(colname)) {
                return;
            }

            var div = headerTable.find("div.col[colname=" + orderBy.name() + "]");

            headerTable.find("div.col[colname]").removeClass("desc");
            headerTable.find("div.col[colname]").removeClass("asc");

            orderBy.name("");
            orderBy.path("");
            orderBy.desc(false);

            orderBy.inProgress(true);
            if (settings.sortMethod) {
                settings.sortMethod("id", false);
                orderBy.inProgress(false);
                return;
            }
            orderBy.inProgress(false);
        };

        me.sorted = ko.cmp(function () {
            if (!settings.sortable || orderBy.inProgress() || settings.sortMethod) {
                return settings.source();
            }

            var path = orderBy.path();

            if (isEmpty(path)) {
                return settings.source();
            }

            return settings.source().orderBy(function (it) {
                var value;
                var temp = it;
                var parts = path.split(".");
                for (var i = 0; i < parts.length; i++) {
                    var p = toJsName(parts[i]);

                    if (typeof temp[p] == "function") {
                        value = temp[p]();
                    } else if (typeof temp[p] != "undefined") {
                        value = temp[p];
                    } else {
                        value = "";
                    }
                    temp = value;
                }

                var formaters = [{
                    reg: "^[-]?\\d+$",
                    fn: parseInt
                }, {
                    reg: "^[-]?\\d+[.]?\\d*$",
                    fn: parseFloat
                }, {
                    reg: "^\\d\\d[.]\\d\\d[.]\\d\\d\\d\\d$",
                    fn: parseDate
                }, {
                    reg: ".*",
                    fn: function (v) { return (v || "").toString().toLowerCase(); }
                }];

                for (var i = 0; i < formaters.length; i++) {
                    var reg = new RegExp(formaters[i].reg, "gi");

                    if (reg.test(value)) {
                        value = formaters[i].fn(value);
                        break;
                    }
                }

                return value;
            }, orderBy.desc());
        });

        if (settings.autoSort && settings.source && settings.source.subscribe) {
            settings.source.subscribe(function () {
                orderBy.order();
            });
        }

        if ($("#" + settings.styleID).size() < 1) {
            var style = "<style id='" + settings.styleID + "' type='text/css'></style>";
            $("head").append(style);
        }

        me.find("thead tr:first th").each(function (i) {
            var th = $(this);
            var w = th.width();
            var colname = th.attr("colname");
            var sortpath = th.attr("sortpath");
            var text = th.text();

            text = isEmpty(text.trim()) && !isEmpty(th.attr("title")) ? th.attr("title") : text;
            sortpath = sortpath ? sortpath : colname;

            var chbID = "chb_" + settings.headerTableID + "_" + colname;
            headerTable.push(["<td colname='", colname, "' data-bind='", th.attr("data-bind"), "'><div class='col' style='width:", w, "px;' colname='", colname, "'",
                                " sortpath='", sortpath, "'", "><div class='text'>", th.html() || "&nbsp;", "</div></div></td>"].join(""));

            if (colname != "Save") {
                columnsMenu.push("<li class='item'><div><input type='checkbox' checked='checked' value='", colname, "' id='", chbID, "' /><label for='", chbID, "'>", text, "</span></div></li>");
            }
        });

        headerTable.push("</tr></table></div>");
        headerTable = $(headerTable.join(""));
        headerTable.find("div.col[colname]").each(function (n) {
            var div = $(this);
            var th = $(me.find("thead tr:first th").get(n));

            if (settings.sortable && settings.disallowSort.indexOf(div.attr("colname")) < 0) {
                div.addClass("orderable");
                div.click(function () {
                    var oldName = orderBy.name();
                    var newName = div.attr("colname");
                    var sortpath = div.attr("sortpath");

                    if (isEmpty(sortpath)) {
                        sortpath = newName;
                    }

                    if (oldName != newName) {
                        orderBy.name(newName);
                        orderBy.path(sortpath);
                        orderBy.desc(false);
                    } else if (orderBy.desc()) {
                        orderBy.clear();
                    } else {
                        var desc = !orderBy.desc();
                        orderBy.desc(desc);
                    }
                    orderBy.order();
                });
            }

            div.removeAttr("style");
            div.resizable({
                handles: "e",
                start: function (event, ui) {
                },
                stop: function (event, ui) {
                    setWidth(div, ui.size.width);
                    div.css({
                        height: "auto",
                        maxHeight: "100px"
                    });
                    makeStyle();
                    div.removeAttr("style");
                },
                resize: function (event, ui) {
                },
                helper: "ui-resizable-helper"
            });

            div.draggable({
                revert: "invalid",
                helper: "clone",
                cursor: "move",
                start: function (event, ui) {
                    ui.helper.addClass("drag");
                },
                drag: function (event, ui) {
                },
                stop: function (event, ui) {
                }
            });

            div.droppable({
                addClasses: false,
                accept: "#" + settings.headerTableID + " div.col",
                activeClass: "active",
                hoverClass: "hover",
                tolerance: "pointer",
                drop: function (event, ui) {
                    var helper = ui.helper;
                    var newTd = div.parents("td:first").get(0);
                    var oldTd = helper.parents("td:first").get(0);
                    var newIndex = newTd.cellIndex;
                    var oldIndex = oldTd.cellIndex;

                    if (oldIndex == newIndex) {
                        return;
                    }

                    sort($("#" + settings.tableID), oldIndex, newIndex);
                    sort($("#" + settings.headerTableID), oldIndex, newIndex);
                    sortTemplate(oldIndex, newIndex);
                }
            });
        });

        columnsMenu.push("</ul>");
        columnsMenu = $(columnsMenu.join(""));
        columnsMenu.find("input[type=checkbox]").change(function () {
            var chb = $(this);
            var td = headerTable.find("td[colname=" + chb.val() + "]");

            if (td.size() < 1) {
                return;
            }

            td.get(0).visible = chb.checked();
            makeStyle();
        });

        columnsMenu.find("a.delete").click(function () {
            columnsMenu.hide();
        });

        columnsMenu.attr("id", settings.headerTableID + "Menu");
        columnsMenu.hideOnClick();

        headerTable.find("table").bind("contextmenu", function (e) {
            e.preventDefault();

            var z = Math.max.apply(null, $.map($('body > *'), function (e, n) {
                if ($(e).css('position') == 'absolute') {
                    return parseInt($(e).css('z-index')) || 1;
                }
            }));

            var d = document;
            var x = e.pageX ? e.pageX : e.clientX + d.scrollLeft;
            var y = e.pageY ? e.pageY : e.clientY + d.scrollTop;

            columnsMenu.css({ top: y, left: x, zIndex: z + 10 });
            columnsMenu.slideDown(300);
            columnsMenu.find("input:first").focus();

            return false;
        });

        settings.menu = columnsMenu;
        settings.header = headerTable;

        $("body").append(columnsMenu);
        settings.headerContainer.prepend(headerTable);
        settings.headerContainer.css("position", "relative");

        if (settings.columns.length > 0) {
            setColumns(settings.columns);
        }

        makeStyle(settings.columns);
        me.find("thead").hide();

        var timer;
        var parent = me.parent();
        parent.scroll(setHeaderPosition);

        me.data("koGrid", true);
    }

    if (options == "refresh") {
        setColumns(getColumns());
        setHeaderPosition();
    }

    if (options == "getColumns") {
        return getColumns();
    }

    if (options == "setColumns") {
        setColumns(value);
    }

    if (options == "order") {
        me.settings.orderBy.order();
    }

    function setHeaderPosition() {
        var parent = me.parent();
        var oldScroll = parent.data("scroll");
        var parentScrollTop = parent.scrollTop();

        if (oldScroll == parentScrollTop) {
            return;
        }

        parent.data("scroll", parentScrollTop);
        me.settings.headerContainer.css("top", "0px");

        clearTimeout(timer);
        timer = setTimeout(function () {
            me.settings.headerContainer.css("top", parentScrollTop + "px");
        }, 500);
    }

    function getColumns() {
        var headerTable = me.settings.header;
        var columns = [];

        headerTable.find("td[colname]").each(function (n) {
            var td = $(this);
            var div = td.find("div[colname]");
            var colname = div.attr("colname");
            var sortpath = div.attr("sortpath");
            columns.push({
                colname: colname,
                sortpath: sortpath,
                index: n,
                width: div.width(),
                visible: td.get(0).visible === false ? false : true,
                order: colname == me.settings.orderBy.name() ? true : false,
                desc: me.settings.orderBy.desc()
            });
        });

        return columns;
    }

    function setColumns(columns) {
        columns = columns.orderByDesc("val=>val.index");
        makeStyle(columns);

        var headerTable = me.settings.header;
        var columnsMenu = me.settings.menu;

        for (var i = 0; i < columns.length; i++) {
            var c = columns[i];

            if (!c.colname) {
                continue;
            }

            var td = headerTable.find("td div[colname=" + c.colname + "]:first").parents("td:first");
            var chb = columnsMenu.find("input[value=" + c.colname + "]:first");

            chb.checked(c.visible === false ? false : true);

            if (td.size() < 1) {
                continue;
            } else {
                td = td.get(0);
                td.visible = c.visible === false ? false : true;
            }

            var oldIndex = td.cellIndex;
            var newIndex = 0;
            sort(me, oldIndex, newIndex);
            sort(headerTable, oldIndex, newIndex);
            sortTemplate(oldIndex, newIndex);

            if (c.order) {
                me.settings.orderBy.name(c.colname);
                me.settings.orderBy.path(c.sortpath);
                me.settings.orderBy.desc(c.desc);
            }
        }

        me.settings.orderBy.order();
    }

    function makeStyle(columns) {
        var style = [];
        var height = 0;
        var colCount = 0;
        var headerTable = me.settings.header;
        var getColStyle = function (n, w, v) {
            var s = [];
            w = parseInt(w) > 0 ? w : 100;
            var wp = parseInt(w) - me.settings.padding;

            s.push(["#", me.settings.headerTableID, " td[colname=", n, "] {max-width:", w, "px; min-width:", w, "px; width:", w, "px;}\n"].join(""));
            s.push(["#", me.settings.headerTableID, " div[colname=", n, "] {max-width:", w, "px; min-width:", w, "px; width:", w, "px;}\n"].join(""));
            s.push(["#", me.settings.tableID, " th[colname=", n, "] {max-width:", w, "px; min-width:", w, "px; width:", w, "px;}\n"].join(""));
            s.push(["#", me.settings.tableID, " th[colname=", n, "] div.th {max-width:", wp, "px; min-width:", wp, "px; width:", wp, "px;}\n"].join(""));
            s.push(["#", me.settings.tableID, " td[colname=", n, "] {max-width:", wp, "px; min-width:", wp, "px; width:", wp, "px;}\n"].join(""));
            s.push(["#", me.settings.tableID, " td[colname=", n, "] div.td {max-width:", wp, "px; min-width:", wp, "px; width:", wp, "px;}\n"].join(""));

            if (v === false) {
                s.push(["#", me.settings.headerTableID, " td[colname=", n, "] {display:none;}\n"].join(""));
                s.push(["#", me.settings.tableID, " td[colname=", n, "] {display:none;}\n"].join(""));
            }

            return s.join("");
        };

        if (columns && columns.length > 0) {
            for (var i = 0; i < columns.length; i++) {
                var c = columns[i];
                style.push(getColStyle(c.colname, c.width, c.visible));
            }

            headerTable.find("div.col[colname]").each(function () {
                var div = $(this);
                var h = div.find("div.text").outerHeight();
                if (height < parseInt(h)) {
                    height = parseInt(h);
                }
            });

            colCount = columns.length;
        } else {
            headerTable.find("td[colname]").each(function (n) {
                var td = $(this);
                var div = td.find("div.col[colname]");
                var h = div.find("div.text").outerHeight();
                var w = parseInt(div.width());
                var v = td.get(0).visible;
                var colname = div.attr("colname");

                if (height < parseInt(h)) {
                    height = parseInt(h);
                }

                style.push(getColStyle(colname, w, v));
                colCount++;
            });
        }

        $("#" + me.settings.styleID).html(style.join(""));
    }

    function setWidth(el, w) {
        el.css({
            width: w + "px",
            minWidth: w + "px",
            maxWidth: w + "px"
        });
    }

    function sort(table, oldIndex, newIndex) {
        table.find("tr").each(function () {
            var cells = $(this).children("td, th");

            if (newIndex < oldIndex) {
                $(cells[newIndex]).before(cells[oldIndex]);
            } else {
                $(cells[newIndex]).after(cells[oldIndex]);
            }
        });
    }

    function sortTemplate(oldIndex, newIndex) {
        var tbl = $("<table/>");
        tbl.html($("#" + me.settings.koTemplateID).html());
        sort(tbl, oldIndex, newIndex);
        $("#" + me.settings.koTemplateID).replaceWith([
                    "<script type='text/html' id='", me.settings.koTemplateID, "'>",
                    tbl.html(),
                    "</", "script>"
        ].join(""));
    };

    return me;
};

$.fn.koGrid.getSaveSettingsObject = function (settingsName, tableID) {
    var result = {
        name: settingsName,
        save: function () {
            var value = $("#" + tableID).koGrid("getColumns");
            var name = settingsName;

            result.inProgress(true);
            saveSetting(name, value, function () {
                result.inProgress(false);
            });
        },
        inProgress: ko.obs(false)
    };

    return result;
};