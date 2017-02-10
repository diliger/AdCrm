$(function () {
    var h = $(window).height() - 280;

    z.userSettings(function (s) {
        if (!s.employeeMenu) {
            s.employeeMenu = {};
        }

        return s;
    });

    $("fieldset.collapsable legend span.title").click(function () {
        $(this).parents("fieldset:first").toggleClass("closed");
    });

    var toggleSplitter = function () {
        var div = $(this);
        var is = !div.data("collapsed");
        var table = div.parents("table:first");
        if (is) {
            table.find("td.left").hide();
            table.find("td.right").width("auto");
        } else {
            table.find("td.left").show();
            table.find("td.right").width("auto");
        }

        div.data("collapsed", is);
        table.find("td.line div.line").draggable("option", "disabled", is);

        z.userSettings(function (s) {
            s.employeeMenu.hidden = is;
            return s;
        });

        koModel.setHeight();
        koModel.setWidth();
    };

    $("td.line div.button").click(toggleSplitter);
    $("td.line div.line").dblclick(toggleSplitter);

    $("td.line div.line").draggable({
        axis: "x",
        revert: true,
        revertDuration: 0,
        stop: function (event, ui) {
            var offset = ui.offset;
            var w = offset.left - 30;

            $("td.left").width(w);
            $("td.left div:first").width(w);

            koModel.setWidth();
            koModel.setHeight();

            z.userSettings(function (s) {
                s.employeeMenu.width = w;
                return s;
            });

        }
    });


    window.onFileSelected = ejs.createEvent();
    window.onFileSelected.attach(function (f) {
        if (!f.name.startsWith("employeePhoto")) {
            return;
        }
        //koModel.projectFile().file().name(f.value);
        //koModel.projectFile().fileName(f.value);

        var ext = f.value.split(".").last().toLowerCase();
        var allow = ["jpg", "png", "jpeg"];
        if (!allow.contains(ext)) {
            ejs.alert("Внимание!", "Пожалуйста выберите правильный файл-изображение с расширением " + allow.join(",") + "!");
            return;
        }

        top.busy("FileUpload");
        $("#frmUploadPhoto").contents().find("form").submit();
    });

    window.onFileUploaded = ejs.createEvent();
    window.onFileUploaded.attach(function (item) {
        if (!item.name.startsWith("employeePhoto")) {
            return;
        }
        top.free("FileUpload");

        if (item.code == 200) {
            koModel.employee.pictureID(item.file.id);
            koModel.employee.pictureName(item.file.name);
            //file.id(item.file.id);
            //file.name(item.file.name);

        } else {
            alert(item.message);
        }
    });

    koModel.setHeight = function () {
        var h = $(window).height() - 270;
        var tblh = $("#tblEmployeeDetails.splitter").height();

        $("#tblEmployeeDetails.splitter .tab-content").each(function () {
            var frm = $(this);
            var frmh = frm.height();

            if (frmh < h) {
                frm.height(h);
            }
        });

        if (tblh < h) {
            $("#tblEmployeeDetails.splitter").height(h);
        }

        h = $("#tblEmployeeDetails.splitter").height();
        h = h / 2;
        $("div.line").css({ height: h, paddingTop: h });

        $(".right .scroll.kogrid").each(function () {
            var grid = $(this);
            var rh = $(".right").height();
            var off = grid.offset().top;
            if (off == 0) {
                return;
            }

            off = off - $(".right").offset().top;
            rh = rh - off - 44;

            grid.css("max-height", rh + "px");
        });
    };

    koModel.setWidth = function () {
        var left = $("#tblEmployeeDetails td.left").css("display") == "none" ? 0 : $("#tblEmployeeDetails td.left").width();

        var maxWidth = $("#tblEmployeeDetails").parent().width() - (left + $("#tblEmployeeDetails td.line").width() + 2);
        $("#tblEmployeeDetails td.right").css("max-width", maxWidth - 2);
        $("#tblEmployeeDetails td.right>div").css("max-width", maxWidth - 2);
        $("#tblEmployeeDetails td.right fieldset").each(function () {
            $(this).css("max-width", $(this).parent().width() - 2);
        });
    };

    z.userSettings(function (s) {
        if (s.employeeMenu.width) {
            var w = s.employeeMenu.width;

            $("td.left").width(w);
            $("td.left div:first").width(w);
        }

        if (s.employeeMenu.hidden) {
            $(".left").hide();
            $(".right").width("auto");

            $("td.line div.button").data("collapsed", true);
            $("td.line div.line").draggable("option", "disabled", true);
        }

        return s;
    });

    koModel.setHeight();
    koModel.setWidth();

    loadHtml();

    $(window).resize(function () {
        koModel.setHeight();
        koModel.setWidth();
    });

    var disableAll = function () {
        if (disableAll.inProgress)
            return;
        disableAll.inProgress = true;
        setTimeout(function () {
            var div = $(".eReadOnly");
            div.find("input,select,textarea,.icon.small:not(.save),.edit,.clickToEdit").disabled(true);

            disableAll.inProgress = false;
        }, 500);
    };

    if (host.ur == 4) {
        disableAll();
        $(document).mousemove(disableAll);
    }
});

function loadHtml() {
    $.ajax({
        url: ApplicationRootPath + "Expenses/ListPartial/" + host.p + "?ViewType=2&EmployeeID=" + koModel.employeeID,
        success: function (result) {
            $("#divExpenses").append(result);
            koModel.expensesKoModel.filter.employeeID = koModel.employee.id();
            koModel.expensesKoModel.filter.dateFrom = function () {
                var date = new Date();
                date.setDate(1);
                date.setMonth(koModel.filter.month() - 1);
                date.setYear(koModel.filter.year());
                return date.toSds();
            };
            koModel.expensesKoModel.filter.dateTo = function () {
                var date = new Date();
                date.setDate(1);
                date.setYear(koModel.filter.year());
                date.setMonth(koModel.filter.month());
                date.setDate(0);
                return date.toSds();
            };
            //koModel.expensesKoModel.defer = false;
            koModel.expensesKoModel.refresh();

            koModel.setHeight();
        }
    });

    //$.ajax({
    //    url: host.arp + "Employee/ExpensePrices/" + host.p,
    //    success: function (result) {
    //        $("#divExpensePrices").append(result);
    //        koModel.expensePricesKoModel.filter.employeeID(koModel.employee.id());
    //    }
    //});

    $.ajax({
        url: ApplicationRootPath + "Employee/Incomes/?ID=" + host.p,
        success: function (result) {
            $("#divIncomes").append(result);
            koModel.incomesKoModel.filter.walletToID(koModel.employee.walletID());
            if (host.ur == host.roles.manager && koModel.employee.userID() != host.uid) {
                koModel.incomesKoModel.filter.creatorID(host.uid);
            }
            koModel.incomesKoModel.filter.dateFrom = function () {
                var date = new Date();
                date.setDate(1);
                date.setMonth(koModel.filter.month() - 1);
                date.setYear(koModel.filter.year());
                return date.toSds();
            };
            koModel.incomesKoModel.filter.dateTo = function () {
                var date = new Date();
                date.setDate(1);
                date.setYear(koModel.filter.year());
                date.setMonth(koModel.filter.month());
                date.setDate(0);
                return date.toSds();
            };
            //koModel.incomesKoModel.refresh();
        }
    });

    $.ajax({
        url: ApplicationRootPath + "Employee/Transfers/?ID=" + host.p,
        success: function (result) {

            $("#divTransfers").append(result);
            koModel.transfersKoModel.filter.walletFromID(koModel.employee.walletID());
            //if (host.ur == host.roles.manager && koModel.employee.userID() != host.uid) {
            //    koModel.transfersKoModel.filter.creatorID(host.uid);
            //}
            koModel.transfersKoModel.filter.dateFrom = function () {
                var date = new Date();
                date.setDate(1);
                date.setMonth(koModel.filter.month() - 1);
                date.setYear(koModel.filter.year());
                return date.toSds();
            };
            koModel.transfersKoModel.filter.dateTo = function () {
                var date = new Date();
                date.setDate(1);
                date.setYear(koModel.filter.year());
                date.setMonth(koModel.filter.month());
                date.setDate(0);
                return date.toSds();
            };
            //koModel.transfersKoModel.refresh();
        }
    });
}