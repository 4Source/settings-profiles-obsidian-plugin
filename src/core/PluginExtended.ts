import { Plugin, setIcon } from "obsidian";

export default class PluginExtended extends Plugin {

    /**
     * 
     */
    addStatusBarItem(): HTMLElement;
    /**
     * @param icon The icon name to be used.
     * @param label The label to be displayed in status bar.
     */
    addStatusBarItem(icon?: string, label?: string, ariaLabel?: string, onClickCallback?: () => void): HTMLElement;


    addStatusBarItem(icon?: string, label?: string, ariaLabel?: string, onClickCallback?: () => void): HTMLElement {
        const item = super.addStatusBarItem();
        if (icon) {
            const iconWrapper = item.createEl('span', { cls: ['status-bar-item-icon', 'status-bar-item-segment'] });
            setIcon(iconWrapper, icon);
        }
        if (label) {
            item.createEl('span', { text: label, cls: ['status-bar-item-label', 'status-bar-item-segment'] });
        }
        if (ariaLabel) {
            item.ariaLabel = ariaLabel;
            item.setAttr('data-tooltip-position', 'top');
        }
        if (onClickCallback) {
            item.addClass('mod-clickable');
            item.onClickEvent(() => {
                onClickCallback();
            })
        }

        return item;
    }

    updateStatusBarItem(item: HTMLElement, icon?: string, label?: string, ariaLabel?: string): void {
        if (icon) {
            const iconWrapper = item.getElementsByClassName('status-bar-item-icon')[0] as HTMLElement;
            setIcon(iconWrapper, icon);
        }
        if (label) {
            const labelEl = item.getElementsByClassName('status-bar-item-label')[0] as HTMLElement
            labelEl.setText(label);
        }
        if (ariaLabel) {
            item.ariaLabel = ariaLabel;
        }
    }

    removeStatusBarItem(item: HTMLElement): void {
        item.remove();
    }
}
