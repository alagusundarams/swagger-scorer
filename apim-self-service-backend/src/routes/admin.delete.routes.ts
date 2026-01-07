/**
 * Admin Delete Routes (Saga-based)
 * 
 * Endpoints for admin-only deletion of orphaned resources.
 */

import { FastifyPluginAsync } from 'fastify';
// Controller retrieved from container
const adminDeleteRoutes: FastifyPluginAsync = async (fastify) => {
    const { adminController: controller } = fastify.container;


    // PRODUCTS
    fastify.delete('/admin/products/:id', (req, reply) => controller.deleteResource(req, reply, 'product'));
    fastify.post('/admin/products/bulk-delete', (req, reply) => controller.bulkDeleteResources(req, reply, 'product', 'productIds'));

    // SUBSCRIPTIONS
    fastify.delete('/admin/subscriptions/:id', (req, reply) => controller.deleteResource(req, reply, 'subscription'));
    fastify.post('/admin/subscriptions/bulk-delete', (req, reply) => controller.bulkDeleteResources(req, reply, 'subscription', 'subscriptionIds'));

    // NAMED VALUES
    fastify.delete('/admin/named-values/:id', (req, reply) => controller.deleteResource(req, reply, 'named_value'));
    fastify.post('/admin/named-values/bulk-delete', (req, reply) => controller.bulkDeleteResources(req, reply, 'named_value', 'named_valueIds'));

    // BACKENDS
    fastify.delete('/admin/backends/:id', (req, reply) => controller.deleteResource(req, reply, 'backend'));
    fastify.post('/admin/backends/bulk-delete', (req, reply) => controller.bulkDeleteResources(req, reply, 'backend', 'backendIds'));

};

export default adminDeleteRoutes;
