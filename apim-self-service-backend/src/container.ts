import { AppConfig } from './types/index.js';
import { GitService } from './services/git/GitService.js';
import { XmlService } from './services/policy/XmlService.js';
import { DeleteSagaOrchestrator } from './services/workflow/sagas/DeleteSaga.js';
import { CreateSagaOrchestrator } from './services/workflow/sagas/CreateSaga.js';
import { PolicyController } from './controllers/PolicyController.js';
import { ProductsController } from './controllers/ProductsController.js';
import { ApisController } from './controllers/ApisController.js';
import { NamedValuesController } from './controllers/NamedValuesController.js';
import { AdminController } from './controllers/AdminController.js';
import { TeamsController } from './controllers/TeamsController.js';
import { ApprovalsController } from './controllers/ApprovalsController.js';
import { AppsController } from './controllers/AppsController.js';
import { AuditController } from './controllers/AuditController.js';
import { SubscriptionsController } from './controllers/SubscriptionsController.js';
import { DashboardController } from './controllers/DashboardController.js';
import { OnboardingController } from './controllers/OnboardingController.js';
import { ValidationController } from './controllers/ValidationController.js';
import { BackendsController } from './controllers/BackendsController.js';

export interface Container {
    gitService: GitService;
    xmlService: XmlService;
    deleteSaga: DeleteSagaOrchestrator;
    createSaga: CreateSagaOrchestrator;
    policyController: PolicyController;
    productsController: ProductsController;
    apisController: ApisController;
    namedValuesController: NamedValuesController;
    adminController: AdminController;
    teamsController: TeamsController;
    approvalsController: ApprovalsController;
    appsController: AppsController;
    auditController: AuditController;
    subscriptionsController: SubscriptionsController;
    dashboardController: DashboardController;
    onboardingController: OnboardingController;
    validationController: ValidationController;
    backendsController: BackendsController;
}

/**
 * Composition Root: Initializes all services and controllers with their dependencies.
 * This should be called AFTER AppConfig is loaded.
 */
export async function initializeContainer(config: AppConfig): Promise<Container> {
    // 1. Core Services
    const gitService = new GitService(config);
    const xmlService = new XmlService();

    // 2. Workflows / Sagas
    const deleteSaga = new DeleteSagaOrchestrator(gitService);
    const createSaga = new CreateSagaOrchestrator(gitService);

    // 3. Controllers
    const policyController = new PolicyController(gitService, xmlService);
    const productsController = new ProductsController();
    const apisController = new ApisController();
    const namedValuesController = new NamedValuesController();
    const adminController = new AdminController();
    const teamsController = new TeamsController();
    const approvalsController = new ApprovalsController();
    const appsController = new AppsController();
    const auditController = new AuditController();
    const subscriptionsController = new SubscriptionsController();
    const dashboardController = new DashboardController();
    const onboardingController = new OnboardingController();
    const validationController = new ValidationController();
    const backendsController = new BackendsController();

    return {
        gitService,
        xmlService,
        deleteSaga,
        createSaga,
        policyController,
        productsController,
        apisController,
        namedValuesController,
        adminController,
        teamsController,
        approvalsController,
        appsController,
        auditController,
        subscriptionsController,
        dashboardController,
        onboardingController,
        validationController,
        backendsController
    };
}

