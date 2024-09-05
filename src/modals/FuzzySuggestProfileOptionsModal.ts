import { App, FuzzySuggestModal } from "obsidian";
import { DEFAULT_PROFILE_OPTIONS, ProfileOptions } from "src/settings/SettingsInterface";

export class FuzzySuggestModalProfileOptions extends FuzzySuggestModal<keyof ProfileOptions> {
  	onSubmit: (result: (keyof ProfileOptions)[]) => void;

	constructor(app: App, onSubmit: (result: (keyof ProfileOptions)[]) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	getItems(): (keyof ProfileOptions)[] {
		let options: (keyof ProfileOptions)[] = []; 
		Object.keys(DEFAULT_PROFILE_OPTIONS).forEach(key => {
			const value = DEFAULT_PROFILE_OPTIONS[key as keyof ProfileOptions];
			if(typeof value == 'boolean') {
				options.push(key as keyof ProfileOptions);
			}
		});
		options.sort((a: keyof ProfileOptions, b: keyof ProfileOptions) => a.localeCompare(b));
		return options;
	}
	getItemText(item: keyof ProfileOptions): string {
		return item;
	}
	onChooseItem(item: keyof ProfileOptions, evt: MouseEvent | KeyboardEvent): void {
		this.onSubmit([item]);
	}
}