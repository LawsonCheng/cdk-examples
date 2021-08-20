# CDK Examples
As projects I am working on require to deploy by using cdk. So that I would like to share how to create a cloudformation stack by using cdk.

## Examples
Edit `config.ts` and fulfill the prerequisite before you start to deploy your stack.


---
### fargate-with-custom-loadbalancer
Sometime you want to have one load balancer and forward requests to different target group according under some conditions. In this example, you will see the load balancer forwards all requests to target group with the listener conditon(`elbv2.ListenerCondition.pathPatterns(['*'])`).
Customize the condition as you need.

Then you can replicate this example into different module and share the same load balancer by setting different listener conditions.

Before run the cdk deployment, we need to prepare some resources from the AWS console.
1. Create an Application Load Balancer
2. Create an cluster with farget service type

--- 
### fargate-with-loadbalancer
This example use `ApplicationLoadBalancedFargateService` from the cdk package `@aws-cdk/aws-ecs-patterns`. It helps you to create fargate service with a configured load balancer very easily. This example requires you to create a ECS cluster first.

### load-balanced-ec2-with-auto-scaling-group
In this example, the stack will create an ecs cluster containing a service running on load balanced ec2 instances, those instances are managing by an auto scaling group. Instance will be added or stopped when the metrics of the instances meet specific ultilization of cpu or memory.