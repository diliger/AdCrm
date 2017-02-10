$(function () {
    

    z.userSettings(function (s) {
        if (!s) {
            s = {};
        }
        if (!s.projectMenu) {
            s.projectMenu = {};
        }

        return s;
    });
    $("a.contractor").hide();
    $("fieldset.collapsable legend span.title").click(function () {
        $(this).parents("fieldset:first").toggleClass("closed");
        koModel.setHeight();
    });

    koModel.qtip = function (text) {
        window.showTip(text || "Данные успешно сохранены");
    };

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
            s.projectMenu.hidden = is;
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
            //var offset = ui.offset;
            //var w = offset.left - 30;
            var w = $("td.left").width() + ui.position.left;

            $("td.left").width(w);
            $("td.left div:first").width(w);

            koModel.setWidth();
            koModel.setHeight();

            z.userSettings(function (s) {
                s.projectMenu.width = w;
                return s;
            });

        }
    });

    koModel.setHeight = function () {
        $("div.line").css({ height: 0, paddingTop: 0 });
        var h = $(window).height() - 200;
        var tblh = $("#tblProjectDetails.splitter").height();

        $("div.container .tab-content").each(function () {
            var frm = $(this);
            var frmh = frm.height();

            if (frmh < h) {
                frm.css("min-height", h + "px");
            }
        });

        if (tblh < h) {
            $("#tblProjectDetails.splitter").height(h);
        }

        h = $("#tblProjectDetails.splitter").height();
        h = h / 2;
        $("div.line").css({ height: h, paddingTop: h });
    };

    koModel.setWidth = function () {
        var left = $("#tblProjectDetails td.left").css("display") == "none" ? 0 : $("#tblProjectDetails td.left").width();

        var maxWidth = $("#tblProjectDetails").parent().width() - (left + $("#tblProjectDetails td.line").width() + 2);
        $("#tblProjectDetails td.right").css("max-width", maxWidth - 2);
        $("#tblProjectDetails td.right>div").css("max-width", maxWidth - 2);
        $("#tblProjectDetails td.right fieldset").each(function () {
            var w = $(this).parent().width() - 2;
            $(this).css("max-width", w);
            $(this).find(".fieldset").each(function () {
                $(this).css("max-width", w - 15);
            });
        });
    };

    z.userSettings(function (s) {
        if (s.projectMenu.width) {
            var w = s.projectMenu.width;

            $("td.left").width(w);
            $("td.left div:first").width(w);
        }

        if (s.projectMenu.hidden) {
            $(".left").hide();
            $(".right").width("auto");

            $("td.line div.button").data("collapsed", true);
            $("td.line div.line").draggable("option", "disabled", true);
        }

        return s;
    });

    koModel.setHeight();
    koModel.setWidth();

    if (window.location.href.endsWith("#frmBills")) {
        koModel.selected.itabID(4);
    } else if (window.location.href.endsWith("#frmExpenses")) {
        koModel.selected.itabID(2);
    }

    loadHtml();

    $(window).resize(function () {
        koModel.setHeight();
        koModel.setWidth();

        $(".ui-dialog-content:visible").each(function () {
            $(this).dialog("option", "position", "center");
        });
    });

    var disableAll = function () {
        var body = $("div#body");
        if (disableAll.inProgress)
            return;
        disableAll.inProgress = true;
        setTimeout(function () {
            body.find("input:not(#divProjectPayments *),select:not(#divProjectPayments select),textarea:not(#divProjectPayments textarea),.icon.small:not(#divProjectPayments .icon.small),.edit,.clickToEdit").disabled(true);

            var div = $("#divPaymentsDialog");
            div.find("input,select,textarea,.icon.small,.edit,.clickToEdit").disabled(true);
            div = $("#divContractDialog");
            div.find("input,select,textarea,.icon.small,.edit,.clickToEdit").disabled(true);

            disableAll.inProgress = false;
        }, 500);
    };

    if (koModel.project.archived()) {
        disableAll();
        $(document).mousemove(disableAll);
    }

    window.onFileSelected = ejs.createEvent();
    window.onFileSelected.attach(function (f) {
        if (!f.name.startsWith("projectFile")) {
            return;
        }
        koModel.projectFile().file().name(f.value);
        koModel.projectFile().fileName(f.value);
    });

    window.onFileUploaded = ejs.createEvent();
    window.onFileUploaded.attach(function (item) {
        if (!item.name.startsWith("projectFile")) {
            return;
        }
        top.free("FileUpload");
        var pf = koModel.projectFile();
        var file = pf.file();

        if (item.code == 200) {
            file.id(item.file.id);
            file.name(item.file.name);
            pf.fileName(item.file.name);
            pf.fileID(file.id());

            koModel.updateAll();

            $("#divAttachmentDialog").data("result", true);
            $("#divAttachmentDialog").dialog("close");
        } else {
            alert(item.message);
        }
    });

    koModel.selectFile = function (name) {
        var frm = $("#frmUploadProjectFile");
        var txt = frm.contents().find("input[type=file]");
        txt.click();
    };

    $("#divAttachmentDialog").dialog({
        width: 660,
        buttons: [{
            text: 'OK', click: function () {
                if ($("#divAttachmentDialog form").valid()) {
                    top.busy("FileUpload");
                    $("#frmUploadProjectFile").contents().find("form").submit();
                }
            }
        }, {
            text: 'Отмена', click: function () {
                $("#divAttachmentDialog").data("result", false);
                koModel.projectFile().file().entity.remove();
                koModel.projectFile().entity.remove();
                $("#divAttachmentDialog").dialog("close");
            }
        }],
        modal: true,
        autoOpen: false,
        open: function () {
            $("#divAttachmentDialog").data("result", "");
        },
        close: function () {
            var pf = koModel.projectFile();
            if (pf && !$("#divAttachmentDialog").data("result")) {
                if (pf.file()) {
                    pf.file().entity.remove();
                }
                pf.entity.remove();
            }
        }
    });
});

function loadHtml() {
    /*$.ajax({
        url: ApplicationRootPath + "Project/WorksDialog",
        success: function (result) {
            $("body").append(result);
        }
    });*/

    //$.ajax({
    //    url: ApplicationRootPath + "Project/PaymentsDialog",
    //    data: { date: new Date() },
    //    success: function (result) {
    //        $("body").append(result);
    //        var div = $("#divPaymentsDialog");
    //        var paymentsHtml = div.find("#divPaymentsDialogList").html();
    //        $("#divProjectPayments").prepend(paymentsHtml);
    //        $("#divContractorPayments").prepend(paymentsHtml);

    //        div.dialog({
    //            title: "Платежи субподрядчику",
    //            width: 900,
    //            buttons: [{ text: 'OK', click: function () { if (!div.find("form:first").valid()) return; koModel.dialog.payments.result(true); div.dialog("close"); } },
    //                    { text: 'Отмена', click: function () { koModel.dialog.payments.result(false); div.dialog("close"); } }],
    //            modal: true,
    //            autoOpen: false,
    //            resizable: false,
    //            close: function () {
    //                koModel.dialog.payments.closed();
    //            },
    //            open: function () {
    //                koModel.dialog.payments.result("");
    //            }
    //        });

    //        ko.apply(koModel, div.get(0));
    //        ko.apply(koModel, $("#divProjectPayments div").get(0));
    //        ko.apply(koModel, $("#divContractorPayments div").get(0));

    //        if (window.location.href.endsWith("#frmBills")) {
    //            koModel.loadAllPayments();
    //        }
    //    }
    //});

    $.ajax({
        url: ApplicationRootPath + "Contractor/Dialog",
        success: function (result) {
            $("body").append(result);
            $("a.contractor").show();
        }
    });

    $.ajax({
        url: host.arp + "Expenses/ListPartial/" + host.p + "?ViewType=1",
        success: function (result) {
            $("#divProjectExpenses").append(result);
            koModel.expensesKoModel.filter.projectID = koModel.project.id();

            koModel.setHeight();
            if (koModel.selected.itabID() == 2) {
                koModel.expensesKoModel.refresh();
            }
        }
    });
}

