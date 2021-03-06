var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var view = require('./view');
var $ = view.$;
var TooltipView = (function (_super) {
    __extends(TooltipView, _super);
    function TooltipView(rect) {
        _super.call(this);
        this.rect = rect;
        $(document.body).append(this.$);
        this.updatePosition();
    }
    TooltipView.content = function () {
        return this.div({
            class: 'atom-typescript-tooltip'
        });
    };
    TooltipView.prototype.updateText = function (text) {
        this.$.html(text);
        this.updatePosition();
    };
    TooltipView.prototype.updatePosition = function () {
        var offset = 10;
        var left = this.rect.right;
        var top = this.rect.bottom;
        var right = undefined;
        if (left + this.$[0].offsetWidth >= view.$(document.body).width())
            left = view.$(document.body).width() - this.$[0].offsetWidth - offset;
        if (left < 0) {
            this.$.css({
                'white-space': 'pre-wrap'
            });
            left = offset;
            right = offset;
        }
        if (top + this.$[0].offsetHeight >= $(document.body).height()) {
            top = this.rect.top - this.$[0].offsetHeight;
        }
        this.$.css({
            left: left,
            top: top,
            right: right
        });
    };
    return TooltipView;
})(view.View);
exports.TooltipView = TooltipView;
