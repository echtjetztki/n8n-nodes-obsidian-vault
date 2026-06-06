import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class ObsidianVault implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Obsidian Vault',
		name: 'obsidianVault',
		icon: 'file:obsidian-vault.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read and write notes in a self-hosted Obsidian Vault via REST API',
		defaults: {
			name: 'Obsidian Vault',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'obsidianVaultApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Note', value: 'note' },
					{ name: 'Search', value: 'search' },
					{ name: 'Health', value: 'health' },
				],
				default: 'note',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['note'] } },
				options: [
					{
						name: 'Append',
						value: 'append',
						description: 'Append content to a note',
						action: 'Append content to a note',
					},
					{
						name: 'Create or Update',
						value: 'write',
						description: 'Create a new note or overwrite an existing one',
						action: 'Create or update a note',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a note or folder',
						action: 'Delete a note',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Read a note',
						action: 'Read a note',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List files and folders under a path',
						action: 'List entries under a path',
					},
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['search'] } },
				options: [
					{
						name: 'Full Text',
						value: 'fullText',
						description: 'Substring search across markdown, txt, JSON, canvas',
						action: 'Full text search the vault',
					},
				],
				default: 'fullText',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['health'] } },
				options: [
					{
						name: 'Check',
						value: 'check',
						description: 'Liveness check (no auth required)',
						action: 'Check API health',
					},
				],
				default: 'check',
			},
			// Common path field for note ops
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: '02 Projekte/EchtJetztKI/Notes.md',
				description: 'Path relative to the vault root. Leave empty for the root folder.',
				displayOptions: {
					show: {
						resource: ['note'],
						operation: ['list'],
					},
				},
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				placeholder: '02 Projekte/EchtJetztKI/Notes.md',
				description: 'Path relative to the vault root',
				displayOptions: {
					show: {
						resource: ['note'],
						operation: ['get', 'write', 'append', 'delete'],
					},
				},
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: { rows: 6 },
				default: '',
				required: true,
				description: 'Markdown content',
				displayOptions: {
					show: {
						resource: ['note'],
						operation: ['write', 'append'],
					},
				},
			},
			{
				displayName: 'Return Raw Markdown',
				name: 'returnRaw',
				type: 'boolean',
				default: true,
				description: 'Whether to return the raw markdown string. If false, wraps it in {path, content}.',
				displayOptions: {
					show: {
						resource: ['note'],
						operation: ['get'],
					},
				},
			},
			// Search
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				description: 'Substring to look for (case-insensitive)',
				displayOptions: {
					show: { resource: ['search'], operation: ['fullText'] },
				},
			},
			{
				displayName: 'Max Results',
				name: 'max',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 200 },
				default: 50,
				displayOptions: {
					show: { resource: ['search'], operation: ['fullText'] },
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			let method: IHttpRequestMethods = 'GET';
			let url = '';
			let body: IDataObject | undefined;
			let qs: IDataObject | undefined;
			let rawResponse = false;

			if (resource === 'note') {
				if (operation === 'list') {
					method = 'GET';
					url = '/api/notes/list';
					qs = { path: this.getNodeParameter('path', i, '') as string };
				} else if (operation === 'get') {
					method = 'GET';
					url = '/api/notes/read';
					qs = { path: this.getNodeParameter('path', i) as string };
					rawResponse = true;
				} else if (operation === 'write') {
					method = 'PUT';
					url = '/api/notes/write';
					body = {
						path: this.getNodeParameter('path', i) as string,
						content: this.getNodeParameter('content', i) as string,
					};
				} else if (operation === 'append') {
					method = 'POST';
					url = '/api/notes/append';
					body = {
						path: this.getNodeParameter('path', i) as string,
						content: this.getNodeParameter('content', i) as string,
					};
				} else if (operation === 'delete') {
					method = 'DELETE';
					url = '/api/notes/delete';
					qs = { path: this.getNodeParameter('path', i) as string };
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown note operation: ${operation}`, {
						itemIndex: i,
					});
				}
			} else if (resource === 'search' && operation === 'fullText') {
				method = 'POST';
				url = '/api/notes/search';
				body = {
					query: this.getNodeParameter('query', i) as string,
					max: this.getNodeParameter('max', i, 50) as number,
				};
			} else if (resource === 'health' && operation === 'check') {
				method = 'GET';
				url = '/healthz';
			} else {
				throw new NodeOperationError(
					this.getNode(),
					`Unknown resource/operation: ${resource}/${operation}`,
					{ itemIndex: i },
				);
			}

			try {
				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'obsidianVaultApi',
					{
						method,
						url,
						qs,
						body,
						json: !rawResponse,
						returnFullResponse: false,
					},
				);

				if (resource === 'note' && operation === 'get') {
					const returnRaw = this.getNodeParameter('returnRaw', i, true) as boolean;
					if (returnRaw) {
						out.push({
							json: {
								path: qs?.path,
								content: typeof response === 'string' ? response : String(response),
							},
						});
					} else {
						out.push({
							json: {
								path: qs?.path,
								content: typeof response === 'string' ? response : String(response),
							},
						});
					}
				} else {
					out.push({ json: response as IDataObject });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [out];
	}
}
