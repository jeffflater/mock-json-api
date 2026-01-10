import { Express, Request, Response } from 'express';

declare namespace mock {
    type TestScope =
        | 'success'
        | 'created'
        | 'noContent'
        | 'badRequest'
        | 'unauthorized'
        | 'forbidden'
        | 'notFound'
        | 'timeout'
        | 'conflict'
        | 'error';

    type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'get' | 'post' | 'put' | 'delete' | 'patch';

    interface MockRoute {
        /** Unique identifier for the route */
        name: string;
        /** URL pattern (supports Express params like `:id` or regex) */
        mockRoute: string;
        /** HTTP method */
        method?: HttpMethod;
        /** Response behavior / HTTP status category */
        testScope?: TestScope;
        /** Which scenario template to use (index, name, or function) */
        testScenario?: number | string | ((req: Request) => number | string);
        /** Response template(s) - string, function, or array of scenarios */
        jsonTemplate?: string | ((req: Request) => string) | Array<((req: Request) => string) | Record<string, (req: Request) => string>>;
        /** Response delay in ms (e.g., 300 or "200-500" for random range) */
        latency?: number | string;
        /** Custom error response body */
        errorBody?: any;
        /** Custom data for dummy-json templates */
        data?: Record<string, any>;
        /** Custom dummy-json helper functions */
        helpers?: Record<string, (...args: any[]) => any>;
    }

    interface PresetRouteConfig {
        /** Scenario to use for this route */
        scenario?: number | string;
        /** Test scope to use for this route */
        scope?: TestScope;
        /** Latency to apply to this route */
        latency?: number | string;
    }

    interface Preset {
        /** Route name or pattern ('*' for all, 'prefix*' for prefix match) mapped to config */
        [routeNameOrPattern: string]: PresetRouteConfig;
    }

    interface LogInfo {
        /** HTTP method */
        method: string;
        /** Request URL */
        url: string;
        /** Matched route name (if found) */
        routeName?: string;
        /** Test scope used */
        scope?: TestScope;
        /** Scenario used */
        scenario?: number | string;
        /** Applied latency in ms */
        latency?: number;
        /** HTTP status code */
        status?: number;
        /** True if no route matched */
        notFound?: boolean;
    }

    type LoggingOption = boolean | 'verbose' | ((info: LogInfo) => void);

    interface CorsOptions {
        origin?: string | string[] | boolean;
        methods?: string | string[];
        allowedHeaders?: string | string[];
        exposedHeaders?: string | string[];
        credentials?: boolean;
        maxAge?: number;
    }

    interface MockConfig {
        /** Array of route configurations (required) */
        mockRoutes: MockRoute[];
        /** File path for data persistence */
        jsonStore?: string;
        /** CORS settings (default: enabled) */
        cors?: boolean | CorsOptions;
        /** Named preset configurations */
        presets?: Record<string, Preset>;
        /** Request logging option */
        logging?: LoggingOption;
    }

    interface DataStore {
        get(key: string): any;
        set(key: string, value: any): any;
        clear(): void;
    }

    interface MockInstance {
        /** Data store instance */
        store: DataStore;
        /** Array of configured routes */
        routes: MockRoute[];
        /** Configuration object */
        config: MockConfig;
        /** Defined presets */
        presets: Record<string, Preset>;
        /** Currently active preset name (null if none) */
        activePreset: string | null;
        /** Logging configuration */
        logging: LoggingOption;

        /** Create an Express app with all middleware and routes configured */
        createServer(): Express;

        /** Reset all state to initial configuration */
        reset(): void;

        /** Route matching middleware */
        registerRoutes(req: Request, res: Response, next?: () => void): void;

        /** Set route scenario via API */
        setRouteScenario(req: Request, res: Response): void;

        /** Get available presets */
        getPresets(req: Request, res: Response): void;

        /** Activate a preset */
        setPreset(req: Request, res: Response): void;
    }
}

/**
 * Create a new mock API instance
 * @param config - Configuration object with routes, presets, and options
 * @returns MockInstance with createServer() method
 */
declare function mock(config: mock.MockConfig): mock.MockInstance;

export = mock;
