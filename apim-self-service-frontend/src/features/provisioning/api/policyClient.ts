
import axios from 'axios';
import { PolicyTemplate } from '../components/policyTemplates';
import { API_CONFIG } from '../../../config/env';

export const getPolicyTemplates = async (): Promise<PolicyTemplate[]> => {
    const { data } = await axios.get<{ templates: PolicyTemplate[] }>(`${API_CONFIG.BASE_URL}/policy/templates`);
    return data.templates;
};
