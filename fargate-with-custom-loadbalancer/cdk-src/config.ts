export const CONFIG = {
    // AWS CONFIG
    AWS : {
        REGION : 'ap-southeast-1',
        ACCOUNT_ID : '123456789'
    },
    // STACK CONFIG
    STACK : {
        // The stack name in the CloudFormation Stack list
        NAME : 'foo-stack-developer',
        // Name of the cluster
        CLUSTER_NAME : 'cluster-name',
        // Name of fargate service
        SERVICE_NAME : 'service-name',
        // Secruity group id
        SECURITY_GROUP_ID : 'sg-1234567890',
        // container port
        CONTAINER_PORT : 4321,
        // Load balancer's listener's rule priority
        RULE_PRIORITY : 2,
        // Load balancer's endpoint
        ALB_DNS : 'foo-alb.123456789.ap-southeast-1.elb.amazonaws.com',
        // Arn of your load balancer's listener
        LISTENER_ARN : 'arn:aws:elasticloadbalancing:ap-southeast-1:123456789:listener/app/foo-alb/1234567890/1234567890'
    }
}