// Type for errors

export interface TsError {
	line: number;
	column: number;
	code: string;
	message: string;
	content: string;
	file?: string;
	fixed?: boolean;
	timestamp?: string;
}
