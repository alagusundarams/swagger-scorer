/**
 * Gateway Factory
 * 
 * Returns gateway service based on type
 * Future: Kong, AWS, Apigee implementations
 */

import { IGatewayService } from '../../types/gateway.types.js';
import { ApimGatewayService } from './apim/apim.gateway.service.js';

export function getGatewayService(gatewayType: string): IGatewayService {
    switch (gatewayType.toLowerCase()) {
        case 'apim':
            return new ApimGatewayService();

        // Future implementations
        // case 'kong':
        //     return new KongGatewayService();
        // case 'aws':
        //     return new AwsGatewayService();

        default:
            throw new Error(`Unsupported gateway type: ${gatewayType}`);
    }
}
